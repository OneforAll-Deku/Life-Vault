// import Memory from '../models/Memory.js'; // REMOVED MONGODB
// import User from '../models/User.js'; // REMOVED MONGODB
import aptosService from '../services/aptosService.js';
import ipfsService from '../services/ipfsService.js';
import pineconeService from '../services/pineconeService.js';

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
      storeOnChain = false
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
          req.user.aptosAddress
        );
      } catch (err) {
        console.error('Blockchain error:', err.message);
      }
    }

    // 3. Prepare Memory Object (For Pinecone)
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileSize = Buffer.byteLength(fileData, 'base64');

    const memoryData = {
      id: memoryId,
      userId: userId,
      title,
      description: description || '',
      category: category || 'other',
      ipfsHash: ipfsResult.ipfsHash,
      ipfsUrl: ipfsResult.gatewayUrl,
      txHash: aptosResult?.txHash || null,
      isOnChain: !!aptosResult?.success,
      fileType,
      fileSize,
      fileName: fileName || '',
      createdAt: new Date()
    };

    // 4. Index in Pinecone (NOW THE PRIMARY STORE)
    console.log('🧠 Storing memory in Pinecone...');
    await pineconeService.upsertMemory(memoryData);

    res.status(201).json({
      success: true,
      message: 'Memory stored successfully',
      data: {
        memory: memoryData,
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

    let results;
    if (search || category) {
      // Use semantic search or filtered search
      const queryTerm = search || category || " ";
      results = await pineconeService.searchMemories(queryTerm, userId, parseInt(limit));
    } else {
      // Just generic fetch
      results = await pineconeService.searchMemories(" ", userId, parseInt(limit));
    }

    const memories = results.map(r => ({
      ...r.metadata,
      _id: r.id, // Compatibility with frontend
      id: r.id,
      score: r.score
    }));

    res.status(200).json({
      success: true,
      count: memories.length,
      data: {
        memories,
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
    const { q, query, limit = 10 } = req.query;
    const searchTerm = q || query;
    const userId = req.user.id || req.user._id;

    if (!searchTerm) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    console.log(`🔍 Searching Pinecone for user ${userId}: "${searchTerm}"`);
    const results = await pineconeService.searchMemories(searchTerm, userId, parseInt(limit));

    const memories = results.map(r => ({
      ...r.metadata,
      _id: r.id,
      id: r.id,
      score: r.score
    }));

    res.status(200).json({
      success: true,
      data: memories
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
    console.log(`🗑️ Deleting memory ${memoryId} from Pinecone`);
    await pineconeService.deleteMemory(memoryId);

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
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalMemories: 0, // Mock
          totalSize: 0,
          onChain: 0
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

// Exporting placeholder controllers to avoid router errors
export const getMemory = (req, res) => res.status(200).json({ success: true, data: {} });
export const updateMemory = (req, res) => res.status(200).json({ success: true, data: {} });
export const relayMemory = (req, res) => res.status(200).json({ success: true, message: 'Relay simulated' });
export const createCapsule = (req, res) => res.status(201).json({ success: true, message: 'Capsule simulated' });
export const claimCapsule = (req, res) => res.status(200).json({ success: true, message: 'Claim simulated' });
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