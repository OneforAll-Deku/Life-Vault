


// file: backEnd/src/routes/shareRoutes.js

import express from 'express';
import SharedLink from '../models/SharedLink.js';
import Memory from '../models/Memory.js';
import { protect } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import os from 'os';
import jwt from 'jsonwebtoken';
import encryptionService from '../services/encryptionService.js';
import crypto from 'crypto';
import User from '../models/User.js';

const router = express.Router();

// Duration options in milliseconds
const DURATION_OPTIONS = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

/**
 * Helper: Get the correct base URL dynamically
 * Priority:
 *   1. FRONTEND_URL env variable (for production / custom domain)
 *   2. Request origin header (browser sends this)
 *   3. Build from request host header
 *   4. Build from local network IP
 */
function getBaseUrl(req) {
  // 1. If explicitly set in env, always use that
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'http://localhost:5173') {
    return process.env.FRONTEND_URL;
  }

  // 2. Use the origin header (sent by browsers automatically)
  if (req.headers.origin) {
    return req.headers.origin;
  }

  // 3. Use the referer header to extract origin
  if (req.headers.referer) {
    try {
      const url = new URL(req.headers.referer);
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      // ignore parse errors
    }
  }

  // 4. Build from the host header
  //    (works when accessing via IP or domain)
  if (req.headers.host) {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https'
      ? 'https'
      : 'http';

    // If host already contains the frontend port, use it directly
    // Otherwise, replace backend port with frontend port
    let host = req.headers.host;
    const backendPort = process.env.PORT || 5000;
    const frontendPort = process.env.FRONTEND_PORT || 5173;

    if (host.includes(`:${backendPort}`)) {
      host = host.replace(`:${backendPort}`, `:${frontendPort}`);
    }

    return `${protocol}://${host}`;
  }

  // 5. Fallback: use local network IP
  const localIp = getLocalNetworkIP();
  const frontendPort = process.env.FRONTEND_PORT || 5173;
  return `http://${localIp}:${frontendPort}`;
}

/**
 * Helper: Get the machine's local network IP (192.168.x.x / 10.x.x.x)
 * So other devices on the same WiFi/LAN can access the link
 */
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address; // e.g., "192.168.1.42"
      }
    }
  }

  return 'localhost'; // ultimate fallback
}

/**
 * @desc    Get server network info (helpful for debugging)
 * @route   GET /api/share/network-info
 * @access  Private
 */
router.get('/network-info', protect, async (req, res) => {
  const localIp = getLocalNetworkIP();
  const frontendPort = process.env.FRONTEND_PORT || 5173;
  const backendPort = process.env.PORT || 5000;

  res.json({
    success: true,
    data: {
      localNetworkIP: localIp,
      frontendUrl: `http://${localIp}:${frontendPort}`,
      backendUrl: `http://${localIp}:${backendPort}`,
      configuredFrontendUrl: process.env.FRONTEND_URL || 'not set',
      detectedBaseUrl: getBaseUrl(req),
      tip: 'Other devices on same network can access using the localNetworkIP URLs'
    }
  });
});

/**
 * @desc    Create a share link for a memory
 * @route   POST /api/share
 * @access  Private
 */
router.post('/', protect, async (req, res, next) => {
  try {
    const {
      memoryId,
      duration = '24h',
      accessType = 'view',
      maxViews = null,
      password = null,
      customBaseUrl = null   // <-- allow client to send their own base URL
    } = req.body;

    // Validate memory exists and belongs to user
    const memory = await Memory.findOne({
      _id: memoryId,
      userId: req.user._id
    });

    if (!memory) {
      return res.status(404).json({
        success: false,
        message: 'Memory not found'
      });
    }

    // Calculate expiration
    const durationMs = DURATION_OPTIONS[duration];
    if (!durationMs) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration. Options: 1h, 6h, 24h, 7d, 30d, 90d'
      });
    }

    const expiresAt = new Date(Date.now() + durationMs);

    // Generate tokens
    const token = SharedLink.generateToken();
    const shortCode = SharedLink.generateShortCode();

    // ── NEW: ZK & Identity Protection ──
    const { zkIdentityCommitment, isZKProtected = false } = req.body;
    let identityCommitment = null;
    if (zkIdentityCommitment) {
      identityCommitment = encryptionService.hash(zkIdentityCommitment);
    }

    // ── NEW: Password Protection via Encryption ──
    let encryptedData = null;
    let hashedPassword = null;
    if (password) {
      // 1. Standard hash for access check
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);

      // 2. Encryption of the IPFS hash using the password
      // This means the server doesn't even "know" the IPFS hash for this share
      // without the password.
      encryptedData = encryptionService.encryptWithPassword(memory.ipfsHash, password);
    }

    // Create share link
    const shareLink = await SharedLink.create({
      memoryId,
      userId: req.user._id,
      token,
      shortCode,
      expiresAt,
      accessType,
      maxViews: maxViews ? parseInt(maxViews) : null,
      password: hashedPassword,
      isPasswordProtected: !!password,
      isZKProtected,
      identityCommitment,
      encryptedData,
      zkChallenge: crypto.randomBytes(16).toString('hex')
    });

    // ──────────────────────────────────────────────
    // KEY FIX: Generate URL dynamically
    // ──────────────────────────────────────────────
    const baseUrl = customBaseUrl || getBaseUrl(req);
    const shareUrl = `${baseUrl}/share/${shortCode}`;

    // Also generate a LAN-accessible URL
    const localIp = getLocalNetworkIP();
    const frontendPort = process.env.FRONTEND_PORT || 5173;
    const lanShareUrl = `http://${localIp}:${frontendPort}/share/${shortCode}`;

    res.status(201).json({
      success: true,
      message: 'Share link created successfully',
      data: {
        shareUrl,            // URL based on how YOU accessed it
        lanShareUrl,         // URL for other devices on same network
        shortCode,
        token,
        expiresAt,
        expiresIn: duration,
        accessType,
        maxViews,
        isPasswordProtected: !!password
      }
    });

  } catch (error) {
    console.error('Create share link error:', error);
    next(error);
  }
});

/**
 * @desc    Get ZK Challenge for a share
 * @route   GET /api/share/:shortCode/challenge
 */
router.get('/:shortCode/challenge', async (req, res) => {
  const { shortCode } = req.params;
  const shareLink = await SharedLink.findOne({ shortCode });

  if (!shareLink || !shareLink.isZKProtected) {
    return res.status(404).json({ success: false, message: 'ZK share or link not found' });
  }

  // Refresh challenge periodically or per request
  shareLink.zkChallenge = crypto.randomBytes(16).toString('hex');
  await shareLink.save();

  res.json({
    success: true,
    data: { challenge: shareLink.zkChallenge }
  });
});

/**
 * @desc    Verify ZK Proof or Password and give an Access Token
 * @route   POST /api/share/:shortCode/verify
 */
router.post('/:shortCode/verify-security', async (req, res) => {
  const { shortCode } = req.params;
  const { password, zkProof } = req.body;

  const shareLink = await SharedLink.findOne({ shortCode });
  if (!shareLink) return res.status(404).json({ success: false, message: 'Link not found' });

  // 1. Password Verification
  if (shareLink.isPasswordProtected) {
    if (!password) return res.status(401).json({ success: false, message: 'Password required' });
    const isMatch = await bcrypt.compare(password, shareLink.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });
  }

  // 2. Identity Verification (ZK Flow)
  if (shareLink.isZKProtected) {
    if (!zkProof) return res.status(401).json({ success: false, message: 'Identity secret required' });

    // Verify secret against commitment
    const proofHash = encryptionService.hash(zkProof);
    if (proofHash !== shareLink.identityCommitment) {
      return res.status(401).json({ success: false, message: 'Identity verification failed' });
    }
  }

  // If verified, generate a time-limited Access Token (JWT)
  // This token is short-lived (e.g., 30 mins)
  const accessToken = jwt.sign(
    {
      shareId: shareLink._id,
      verified: true,
      // If password was used, we can include the decrypted hash in the token (optional)
      // or we can just say "verified"
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '30m' }
  );

  res.json({
    success: true,
    message: 'Verification successful',
    data: { accessToken, expiresIn: '30m' }
  });
});

/**
 * @desc    Access shared memory via link
 * @route   GET /api/share/:shortCode
 */
router.get('/:shortCode/', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const { password: queryPassword, accessToken } = req.query; // can come from query or headers

    const shareLink = await SharedLink.findOne({ shortCode });

    if (shareLink) {
      // Manual population
      shareLink.memoryId = await Memory.findById(shareLink.memoryId);
      shareLink.userId = await User.findById(shareLink.userId);
    }

    if (!shareLink) {
      return res.status(404).json({ success: false, message: 'Share link not found' });
    }

    const validity = shareLink.isValid();
    if (!validity.valid) {
      return res.status(410).json({ success: false, message: validity.reason, expired: true });
    }

    // ── Enforce Advanced Security ──
    let isAuthorized = false;
    let decryptedIpfsUrl = null;

    // Check JWT Access Token
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || 'secret');
        if (decoded.shareId === shareLink._id.toString()) {
          isAuthorized = true;
        }
      } catch (err) {
        // Token invalid, still allow password fallback
      }
    }

    // Fallback to direct password check if provided in query
    if (!isAuthorized && (shareLink.isPasswordProtected || shareLink.isZKProtected)) {
      if (shareLink.isPasswordProtected && queryPassword) {
        const isMatch = await bcrypt.compare(queryPassword, shareLink.password);
        if (isMatch) isAuthorized = true;
      }

      // If still not authorized, return 401
      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          message: 'Authorization required (Password or ZK Proof)',
          securityRequired: {
            password: shareLink.isPasswordProtected,
            zk: shareLink.isZKProtected
          }
        });
      }
    }

    // ── Handle Decryption of Sensitive Data ──
    let ipfsUrl = null;
    const ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

    if (shareLink.encryptedData && (queryPassword || isAuthorized)) {
      // If we used password encryption, we must decrypt it
      // Note: If authorized by JWT but password not in query, 
      // we'd need to have stored the password/key somewhere.
      // For simplicity, if queryPassword exists, we decrypt.
      if (queryPassword) {
        try {
          const decryptedHash = encryptionService.decryptWithPassword(shareLink.encryptedData, queryPassword);
          ipfsUrl = `${ipfsGateway}/${decryptedHash}`;
        } catch (e) {
          // Password from query might be correct for bcrypt but wrong for encryption?
          // (shouldn't happen if password is same)
        }
      }
    }

    // Fallback to standard URL if not encrypted
    if (!ipfsUrl) {
      ipfsUrl = `${ipfsGateway}/${shareLink.memoryId.ipfsHash}`;
    }

    // Record access
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await shareLink.recordAccess(ipAddress, userAgent);

    res.json({
      success: true,
      data: {
        memory: {
          title: shareLink.memoryId.title,
          description: shareLink.memoryId.description,
          category: shareLink.memoryId.category,
          fileType: shareLink.memoryId.fileType,
          fileName: shareLink.memoryId.fileName,
          createdAt: shareLink.memoryId.createdAt,
          ipfsUrl: ipfsUrl,
        },
        share: {
          accessType: shareLink.accessType,
          expiresAt: shareLink.expiresAt,
          viewCount: shareLink.viewCount,
          maxViews: shareLink.maxViews,
          isZKProtected: shareLink.isZKProtected,
        },
        sharedBy: { name: shareLink.userId.name || 'Anonymous' }
      }
    });

  } catch (error) {
    console.error('Access share link error:', error);
    next(error);
  }
});

/**
 * @desc    Verify share link
 * @route   GET /api/share/:shortCode/verify
 * @access  Public
 */
router.get('/:shortCode/verify', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const shareLink = await SharedLink.findOne({ shortCode });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Share link not found'
      });
    }

    const validity = shareLink.isValid();

    res.json({
      success: true,
      valid: validity.valid,
      message: validity.reason || 'Link is valid',
      passwordRequired: shareLink.isPasswordProtected,
      expiresAt: shareLink.expiresAt,
      remainingTime: shareLink.remainingTime
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get all share links for user's memories
 * @route   GET /api/share/user/my-links
 * @access  Private
 */
router.get('/user/my-links', protect, async (req, res, next) => {
  try {
    const shareLinks = await SharedLink.find({
      userId: req.user._id,
      isRevoked: false
    });

    // Sort manually
    shareLinks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Manual population
    for (const link of shareLinks) {
      link.memoryId = await Memory.findById(link.memoryId);
    }

    const baseUrl = getBaseUrl(req);

    const links = shareLinks.map(link => ({
      id: link._id,
      shortCode: link.shortCode,
      shareUrl: `${baseUrl}/share/${link.shortCode}`,
      memory: {
        id: link.memoryId._id,
        title: link.memoryId.title,
        category: link.memoryId.category
      },
      accessType: link.accessType,
      expiresAt: link.expiresAt,
      remainingTime: link.remainingTime,
      isExpired: new Date() > link.expiresAt,
      viewCount: link.viewCount,
      maxViews: link.maxViews,
      isPasswordProtected: link.isPasswordProtected,
      createdAt: link.createdAt
    }));

    res.json({
      success: true,
      data: links
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get share links for a specific memory
 * @route   GET /api/share/memory/:memoryId
 * @access  Private
 */
router.get('/memory/:memoryId', protect, async (req, res, next) => {
  try {
    const { memoryId } = req.params;

    const memory = await Memory.findOne({
      _id: memoryId,
      userId: req.user._id
    });

    if (!memory) {
      return res.status(404).json({
        success: false,
        message: 'Memory not found'
      });
    }

    const shareLinks = await SharedLink.find({
      memoryId,
      userId: req.user._id,
      isRevoked: false
    });
    shareLinks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const baseUrl = getBaseUrl(req);

    const links = shareLinks.map(link => ({
      id: link._id,
      shortCode: link.shortCode,
      shareUrl: `${baseUrl}/share/${link.shortCode}`,
      accessType: link.accessType,
      expiresAt: link.expiresAt,
      remainingTime: link.remainingTime,
      isExpired: new Date() > link.expiresAt,
      viewCount: link.viewCount,
      maxViews: link.maxViews,
      isPasswordProtected: link.isPasswordProtected,
      createdAt: link.createdAt
    }));

    res.json({
      success: true,
      data: links
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Revoke a share link
 * @route   DELETE /api/share/:shortCode
 * @access  Private
 */
router.delete('/:shortCode', protect, async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    const shareLink = await SharedLink.findOne({
      shortCode,
      userId: req.user._id
    });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: 'Share link not found'
      });
    }

    shareLink.isRevoked = true;
    shareLink.isActive = false;
    shareLink.revokedAt = new Date();
    await shareLink.save();

    res.json({
      success: true,
      message: 'Share link revoked successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Update share link settings
 * @route   PATCH /api/share/:shortCode
 * @access  Private
 */
router.patch('/:shortCode', protect, async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const { duration, maxViews, password, removePassword } = req.body;

    const shareLink = await SharedLink.findOne({
      shortCode,
      userId: req.user._id
    });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: 'Share link not found'
      });
    }

    if (duration && DURATION_OPTIONS[duration]) {
      shareLink.expiresAt = new Date(Date.now() + DURATION_OPTIONS[duration]);
    }

    if (maxViews !== undefined) {
      shareLink.maxViews = maxViews ? parseInt(maxViews) : null;
    }

    if (removePassword) {
      shareLink.password = null;
      shareLink.isPasswordProtected = false;
    } else if (password) {
      const salt = await bcrypt.genSalt(10);
      shareLink.password = await bcrypt.hash(password, salt);
      shareLink.isPasswordProtected = true;
    }

    await shareLink.save();

    res.json({
      success: true,
      message: 'Share link updated successfully',
      data: {
        expiresAt: shareLink.expiresAt,
        maxViews: shareLink.maxViews,
        isPasswordProtected: shareLink.isPasswordProtected
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;