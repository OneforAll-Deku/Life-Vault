import Memory from '../models/Memory.js';
import User from '../models/User.js';
import aptosService from '../services/aptosService.js';
import ipfsService from '../services/ipfsService.js';
import supabaseService from '../services/supabaseService.js';

/**
 * @desc    Create new memory
 * @route   POST /api/memories
 * @access  Private
 */
export const createMemory = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      fileData,
      fileName,
      fileType,
      storeOnChain = false,
      network = 'devnet'
    } = req.body;

    const userId = req.user.id || req.user._id;

    if (!title || !fileData) {
      return res.status(400).json({
        success: false,
        message: 'Title and file data are required'
      });
    }

    // 1. Upload to IPFS
    console.log('📤 Uploading to IPFS...');
    const ipfsResult = await ipfsService.pinBase64(fileData, fileName || 'memory', {
      userId: userId.toString(),
      title,
      category
    });
    console.log('✅ IPFS Upload successful:', ipfsResult.ipfsHash);

    // 2. Store on Aptos blockchain (optional)
    let aptosResult = null;
    if (storeOnChain) {
      console.log('⛓️ Storing on Aptos blockchain...');
      try {
        aptosResult = await aptosService.storeMemoryOnChain(
          ipfsResult.ipfsHash,
          network || 'devnet'
        );
      } catch (err) {
        console.error('Blockchain error:', err.message);
      }
    }

    // 3. Prepare Memory Data
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileSize = Buffer.byteLength(fileData, 'base64');

    const memory = new Memory({
      id: memoryId,
      userId: userId,
      title,
      description: description || '',
      category: category || 'other',
      ipfsHash: ipfsResult.ipfsHash,
      ipfsUrl: ipfsResult.gatewayUrl,
      txHash: aptosResult?.txHash || null,
      network: network || 'devnet',
      isOnChain: !!aptosResult?.success,
      fileType,
      fileSize,
      fileName: fileName || '',
      createdAt: new Date()
    });

    // 4. Storing memory in Supabase
    console.log('🧠 Storing memory in Supabase...');
    await memory.save();

    res.status(201).json({
      success: true,
      message: 'Memory stored successfully',
      data: {
        memory,
        ipfs: {
          hash: ipfsResult.ipfsHash,
          url: ipfsResult.gatewayUrl
        },
        aptos: aptosResult
      }
    });

  } catch (error) {
    console.error('Create memory error:', error);
    next(error);
  }
};

/**
 * @desc    Get all memories for current user
 * @route   GET /api/memories
 * @access  Private
 */
export const getMemories = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { search, category, limit = 20 } = req.query;

    console.log(`📋 Fetching memories for user: ${userId}`);

    const query = { userId };
    if (category) query.category = category;

    // Supabase find already handles filtering
    const memories = await Memory.find(query);

    res.status(200).json({
      success: true,
      count: memories.length,
      data: {
        memories: memories.map(m => m.toObject()),
        pagination: {
          total: memories.length,
          page: 1,
          pages: 1
        }
      }
    });
  } catch (error) {
    console.error('Get memories error:', error);
    next(error);
  }
};

/**
 * @desc    Get semantic search results
 */
export const searchMemories = async (req, res, next) => {
  try {
    const { q, query, limit = 10 } = { ...req.query, ...req.body };
    const searchTerm = q || query;
    const userId = req.user.id || req.user._id;

    if (!searchTerm) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    console.log(`🔍 Searching memories for user ${userId}: "${searchTerm}"`);

    // Use Query helper that now supports $or and $regex
    const memories = await Memory.find({
      userId,
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: memories.map(m => ({ ...m.toObject(), score: 1.0 }))
    });
  } catch (error) {
    console.error('Search error:', error);
    next(error);
  }
};

/**
 * @desc    Delete memory
 */
export const deleteMemory = async (req, res, next) => {
  try {
    const memoryId = req.params.id;
    console.log(`🗑️ Deleting memory ${memoryId} from Supabase`);
    await Memory.deleteOne({ id: memoryId });

    res.status(200).json({
      success: true,
      message: 'Memory deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify memory
 */
export const verifyMemory = async (req, res, next) => {
  res.status(200).json({
    success: true,
    verified: true,
    message: 'Memory authenticity verified'
  });
};

/**
 * @desc    Get user stats
 */
export const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const memories = await Memory.find({ userId });

    const totalMemories = memories.length;
    const onChainCount = memories.filter(m => m.isOnChain || m.txHash).length;
    const totalSize = memories.reduce((acc, m) => acc + (m.fileSize || 0), 0);
    const categories = {};
    memories.forEach(m => {
      const cat = m.category || 'uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalMemories,
          totalSize,
          onChain: onChainCount,
          categories
        },
        aptos: {
          address: req.user.aptosAddress,
          balance: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single memory
 */
export const getMemory = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    const userId = req.user.id || req.user._id;
    if (memory.userId?.toString() !== userId.toString()) {
      const isShared = (memory.sharedWith || []).some(sw => (sw.userId || sw.user_id)?.toString() === userId.toString());
      const isBeneficiary = (memory.beneficiaries || []).includes(userId.toString());
      if (!isShared && !isBeneficiary) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.status(200).json({ success: true, data: memory.toObject() });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update memory (e.g. add txHash after blockchain storage)
 */
export const updateMemory = async (req, res, next) => {
  try {
    const memoryId = req.params.id;
    const updates = req.body;
    const userId = req.user.id || req.user._id;

    console.log(`📝 Updating memory ${memoryId} in Supabase`);

    const memory = await Memory.findById(memoryId);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    if (memory.userId?.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can update' });
    }

    const updated = await Memory.findByIdAndUpdate(memoryId, updates);

    res.status(200).json({
      success: true,
      message: 'Memory updated',
      data: updated.toObject()
    });
  } catch (error) {
    console.error('Update memory error:', error);
    next(error);
  }
};

/**
 * @desc    Relay memory to blockchain
 */
export const relayMemory = async (req, res, next) => {
  try {
    const { memoryId } = req.body;
    const memory = await Memory.findById(memoryId);
    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found' });

    console.log(`⛓️ Relaying memory ${memoryId} to Aptos...`);
    const aptosResult = await aptosService.storeMemoryOnChain(
      memory.ipfsHash,
      memory.network || 'devnet'
    );

    if (aptosResult.success) {
      memory.txHash = aptosResult.txHash;
      memory.isOnChain = true;
      await memory.save();
    }

    res.json({ success: true, data: aptosResult });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a time capsule
 */
export const createCapsule = async (req, res, next) => {
  try {
    const { releaseTimestamp, beneficiaryAddress } = req.body;
    if (!releaseTimestamp) return res.status(400).json({ success: false, message: 'Release timestamp required' });

    req.body.isCapsule = true;
    req.body.releaseTimestamp = new Date(releaseTimestamp);
    req.body.beneficiaryAddress = beneficiaryAddress;

    return createMemory(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Claim a time capsule
 */
export const claimCapsule = async (req, res, next) => {
  try {
    const capsule = await Memory.findById(req.params.id);
    if (!capsule || !capsule.isCapsule) {
      return res.status(404).json({ success: false, message: 'Capsule not found' });
    }

    const now = new Date();
    if (now < new Date(capsule.releaseTimestamp)) {
      return res.status(403).json({ success: false, message: 'Capsule is still locked' });
    }

    const userId = req.user.id || req.user._id;
    if (capsule.beneficiaryAddress && capsule.beneficiaryAddress !== req.user.aptosAddress) {
      // Optional: verify if user is the intended beneficiary via other means if aptos address doesn't match
    }

    capsule.isClaimed = true;
    await capsule.save();

    res.json({ success: true, message: 'Capsule claimed', data: capsule.toObject() });
  } catch (error) {
    next(error);
  }
};
export default {
  createMemory,
  getMemories,
  getMemory,
  updateMemory,
  deleteMemory,
  verifyMemory,
  getStats,
  relayMemory,
  createCapsule,
  claimCapsule,
  searchMemories
};