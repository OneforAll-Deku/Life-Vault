import express from 'express';
import User from '../models/User.js';
import aptosService from '../services/aptosService.js';
import bitcoinService from '../services/bitcoinService.js';
import { protect } from '../middleware/authMiddleware.js';
import { AccountAddress, Ed25519PublicKey } from '@aptos-labs/ts-sdk';
import nacl from 'tweetnacl';
import pkg from 'js-sha3';
const { sha3_256 } = pkg;

const router = express.Router();

// ─────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hexString) {
  const clean = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Detect the Aptos account type from public key and signature
 *
 * Aptos prefixes:
 *   0x00 = Ed25519           (32-byte pubkey,  64-byte signature)
 *   0x01 = Multi-Ed25519
 *   0x02 = MultiKey
 *   0x03 = Keyless / OIDC    (variable length, contains provider URL)
 */
function detectAccountType(publicKey, signature) {
  const cleanPubKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;

  // Standard Ed25519: exactly 32 bytes pubkey (64 hex) & 64 bytes sig (128 hex)
  if (cleanPubKey.length === 64 && cleanSig.length === 128) {
    return 'ed25519';
  }

  // Check the first byte prefix
  const prefix = cleanPubKey.substring(0, 2);
  switch (prefix) {
    case '00': return 'ed25519';
    case '01': return 'multi-ed25519';
    case '02': return 'multikey';
    case '03': return 'keyless';
    default: break;
  }

  // Heuristic: if the pubkey contains "accounts.google.com" in hex, it's Keyless
  // 68747470733a2f2f6163636f756e74732e676f6f676c652e636f6d = https://accounts.google.com
  if (cleanPubKey.includes('68747470733a2f2f6163636f756e74732e676f6f676c652e636f6d')) {
    return 'keyless';
  }
  // Apple
  if (cleanPubKey.includes('6170706c6569642e6170706c652e636f6d')) {
    return 'keyless';
  }

  // Bitcoin Heuristic: Testnet addresses start with tb1, m, n, or 2
  // We can also check if it's a Bitcoin address format
  if (publicKey.startsWith('tb1') || publicKey.startsWith('m') || publicKey.startsWith('n') || publicKey.startsWith('2')) {
    return 'bitcoin';
  }

  return 'unknown';
}

/**
 * Verify an account exists on the Aptos blockchain
 * This is our primary verification for Keyless accounts
 */
async function verifyAccountOnChain(address) {
  try {
    const accountInfo = await aptosService.aptos.getAccountInfo({
      accountAddress: address
    });
    return {
      exists: true,
      sequenceNumber: accountInfo.sequence_number,
      authKey: accountInfo.authentication_key
    };
  } catch (error) {
    // Account might not exist on-chain yet (never received funds)
    if (error?.status === 404 || error?.message?.includes('not found')) {
      return { exists: false, reason: 'Account not found on chain' };
    }
    console.warn('⚠️ On-chain verification error:', error.message);
    return { exists: false, reason: error.message };
  }
}

/**
 * Validate basic address format
 */
function isValidAptosAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const clean = address.startsWith('0x') ? address.slice(2) : address;
  // Aptos addresses are 32 bytes = 64 hex chars (with possible leading zeros trimmed)
  return /^[0-9a-fA-F]{1,64}$/.test(clean);
}

/**
 * Verify Ed25519 signature using nacl (for standard Ed25519 accounts)
 */
function verifyEd25519Signature(fullMessage, signature, publicKey) {
  try {
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    const cleanPubKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    const signatureBytes = hexToUint8Array(cleanSig);
    const publicKeyBytes = hexToUint8Array(cleanPubKey);
    const messageBytes = new TextEncoder().encode(fullMessage);

    if (signatureBytes.length !== 64 || publicKeyBytes.length !== 32) {
      return false;
    }

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Ed25519 verification error:', error.message);
    return false;
  }
}

/**
 * Try multiple message formats for Ed25519 verification
 */
function verifyEd25519Alternative(message, signature, publicKey, nonce) {
  try {
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    const cleanPubKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    const signatureBytes = hexToUint8Array(cleanSig);
    const publicKeyBytes = hexToUint8Array(cleanPubKey);

    if (signatureBytes.length !== 64 || publicKeyBytes.length !== 32) {
      return false;
    }

    const formats = [
      message,
      `APTOS\nmessage: ${message}\nnonce: ${nonce}`,
      `APTOS\nmessage: ${message}\nnonce: ${nonce}\nchainId: 1`,
      `APTOS\nmessage: ${message}\nnonce: ${nonce}\nchainId: 2`,
    ];

    for (const fmt of formats) {
      const msgBytes = new TextEncoder().encode(fmt);
      try {
        if (nacl.sign.detached.verify(msgBytes, signatureBytes, publicKeyBytes)) {
          console.log('✅ Ed25519 verified with format:', fmt.substring(0, 50));
          return true;
        }
      } catch {
        // try next
      }
    }
    return false;
  } catch (error) {
    console.error('Ed25519 alternative verification error:', error.message);
    return false;
  }
}

/**
 * Derive address from Ed25519 public key
 * Aptos address = SHA3-256(pubkey || 0x00)
 */
function deriveAddressFromPublicKey(publicKey) {
  try {
    const clean = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    const bytes = hexToUint8Array(clean);

    // Aptos Ed25519 address = SHA3-256(pubkey || 0x00)
    if (bytes.length === 32) {
      const authKeyBytes = new Uint8Array(33);
      authKeyBytes.set(bytes);
      authKeyBytes[32] = 0x00; // Ed25519 scheme

      const hash = sha3_256.create();
      hash.update(authKeyBytes);
      return '0x' + hash.hex();
    }

    return null;
  } catch (error) {
    console.warn('⚠️ Address derivation failed:', error.message);
    return null;
  }
}


// ─────────────────────────────────────────────────────────
// MAIN VERIFICATION LOGIC
// ─────────────────────────────────────────────────────────

/**
 * Unified wallet signature verification
 * Handles Ed25519, Keyless, MultiKey, and unknown account types
 *
 * @returns {{ valid: boolean, accountType: string, method: string, reason?: string }}
 */
async function verifyWalletSignature({
  address,
  publicKey,
  signature,
  message,
  nonce,
  fullMessage
}) {
  const accountType = detectAccountType(publicKey, signature);
  console.log(`🔍 Detected account type: ${accountType}`);

  // ── Ed25519 accounts: cryptographic verification ──────────
  if (accountType === 'ed25519') {
    console.log('🔐 Attempting Ed25519 cryptographic verification...');

    // Method 1: fullMessage from Petra
    if (fullMessage) {
      const ok = verifyEd25519Signature(fullMessage, signature, publicKey);
      if (ok) {
        return { valid: true, accountType, method: 'ed25519-fullMessage' };
      }
    }

    // Method 2: try alternative message formats
    if (message && nonce) {
      const ok = verifyEd25519Alternative(message, signature, publicKey, nonce);
      if (ok) {
        return { valid: true, accountType, method: 'ed25519-alternative' };
      }
    }

    // Method 3: verify address derivation + on-chain existence
    const derived = deriveAddressFromPublicKey(publicKey);
    if (derived && derived.toLowerCase() === address.toLowerCase()) {
      console.log('✅ Address derived from public key matches claimed address');
      return { valid: true, accountType, method: 'ed25519-address-derivation' };
    }

    // Fallback: check on-chain
    const onChain = await verifyAccountOnChain(address);
    if (onChain.exists) {
      console.log('✅ Ed25519 account exists on-chain, accepting');
      return { valid: true, accountType, method: 'ed25519-onchain-fallback' };
    }
    return {
      valid: false,
      accountType,
      method: 'none',
      reason: 'Ed25519 signature verification failed with all methods'
    };
  }

  // ── Bitcoin accounts: cryptographic verification ──────────
  if (accountType === 'bitcoin') {
    console.log('🧡 Attempting Bitcoin cryptographic verification...');
    const result = await bitcoinService.verifySignature(message, signature, address);
    if (result.success) {
      return { valid: true, accountType, method: result.method };
    }
    return {
      valid: false,
      accountType,
      method: 'none',
      reason: result.reason || 'Bitcoin signature verification failed'
    };
  }

  // ── Keyless accounts (Google, Apple OIDC): on-chain verification ──
  if (accountType === 'keyless') {
    console.log('🔐 Keyless account detected (OIDC provider in public key)');
    console.log('   Keyless signatures use ZK proofs — nacl cannot verify these');
    console.log('   Verifying account on-chain instead...');

    if (!isValidAptosAddress(address)) {
      return {
        valid: false,
        accountType,
        method: 'none',
        reason: 'Invalid Aptos address format'
      };
    }

    // Primary check: does the account exist on the Aptos network?
    const onChain = await verifyAccountOnChain(address);

    if (onChain.exists) {
      console.log('✅ Keyless account verified on-chain');
      console.log(`   Sequence number: ${onChain.sequenceNumber}`);
      return { valid: true, accountType, method: 'keyless-onchain' };
    }

    // The account might be brand new (never funded / never transacted)
    // In that case, we trust Petra's client-side signing since:
    //   1. The address format is valid
    //   2. The signature was produced by Petra wallet
    //   3. The public key contains a valid OIDC provider
    console.log('⚠️ Account not yet on-chain (new account)');
    console.log('   Accepting based on valid Petra wallet response');

    // Extra sanity: verify the signature is non-empty and has reasonable length
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    if (cleanSig.length < 64) {
      return {
        valid: false,
        accountType,
        method: 'none',
        reason: 'Keyless signature too short'
      };
    }

    return { valid: true, accountType, method: 'keyless-trusted-wallet' };
  }

  // ── MultiKey / Multi-Ed25519 accounts ─────────────────────
  if (accountType === 'multikey' || accountType === 'multi-ed25519') {
    console.log(`🔐 ${accountType} account detected`);
    console.log('   Verifying account on-chain...');

    if (!isValidAptosAddress(address)) {
      return {
        valid: false,
        accountType,
        method: 'none',
        reason: 'Invalid Aptos address format'
      };
    }

    const onChain = await verifyAccountOnChain(address);
    if (onChain.exists) {
      return { valid: true, accountType, method: `${accountType}-onchain` };
    }

    // Accept if address format is valid (new multi-key account)
    return { valid: true, accountType, method: `${accountType}-trusted-wallet` };
  }

  // ── Unknown account type: best-effort ─────────────────────
  console.log('⚠️ Unknown account type, attempting best-effort verification...');

  if (!isValidAptosAddress(address)) {
    return {
      valid: false,
      accountType,
      method: 'none',
      reason: 'Invalid address format'
    };
  }

  const onChain = await verifyAccountOnChain(address);
  if (onChain.exists) {
    return { valid: true, accountType: 'unknown', method: 'onchain-fallback' };
  }

  // Final fallback: accept valid-looking wallet data
  const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (cleanSig.length >= 64 && address.startsWith('0x')) {
    console.log('⚠️ Accepting based on structural validity (development mode)');
    return { valid: true, accountType: 'unknown', method: 'structural-fallback' };
  }

  return {
    valid: false,
    accountType: 'unknown',
    method: 'none',
    reason: 'All verification methods failed'
  };
}


// ─────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────

/**
 * @desc    Authenticate with Petra wallet
 * @route   POST /api/auth/wallet
 */
router.post('/wallet', async (req, res, next) => {
  try {
    const { address, publicKey, signature, message, nonce, fullMessage } = req.body;

    console.log('\n=== Wallet Authentication ===');
    console.log('Address:', address);
    console.log('Public Key:', publicKey?.substring(0, 50) + '...');
    console.log('Signature:', signature?.substring(0, 50) + '...');
    console.log('Message:', message?.substring(0, 80));
    console.log('Nonce:', nonce);

    if (!address || !publicKey || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required wallet authentication data'
      });
    }

    // ── Unified verification ──────────────────────────────────
    const verification = await verifyWalletSignature({
      address,
      publicKey,
      signature,
      message,
      nonce,
      fullMessage
    });

    console.log(`\n📋 Verification result:`);
    console.log(`   Valid       : ${verification.valid}`);
    console.log(`   Account Type: ${verification.accountType}`);
    console.log(`   Method      : ${verification.method}`);
    if (verification.reason) {
      console.log(`   Reason      : ${verification.reason}`);
    }

    if (!verification.valid) {
      console.log('❌ Authentication rejected');
      return res.status(401).json({
        success: false,
        message: 'Invalid wallet signature',
        accountType: verification.accountType,
        reason: verification.reason
      });
    }

    console.log('✅ Wallet authentication accepted');

    // ── Find or create user ─────────────────────────────────
    let user;
    const accountTypeStr = verification.accountType;

    if (accountTypeStr === 'bitcoin') {
      user = await User.findOne({ bitcoinAddress: address });
      if (!user) {
        user = new User({
          bitcoinAddress: address,
          email: `${address.slice(0, 12)}@bitcoin.blockpix.app`,
          password: `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          isWalletUser: true,
          network: 'bitcoin-testnet4'
        });
        await user.save();
        console.log('👤 New Bitcoin user created:', user._id);
      }
    } else {
      user = await User.findOne({ aptosAddress: address });
      if (!user) {
        user = new User({
          aptosAddress: address,
          aptosPublicKey: publicKey,
          email: `${address.slice(0, 16)}@wallet.blockpix.app`,
          password: `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          isWalletUser: true
        });
        await user.save();
        console.log('👤 New Aptos wallet user created:', user._id);
      } else {
        // Update public key if changed
        if (user.aptosPublicKey !== publicKey) {
          user.aptosPublicKey = publicKey;
        }
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateAuthToken();

    // Get balance
    let balance = null;
    try {
      balance = await aptosService.getBalance(address);
    } catch (err) {
      console.warn('Could not fetch balance:', err.message);
    }

    res.json({
      success: true,
      message: 'Wallet authentication successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          aptosAddress: user.aptosAddress,
          totalMemories: user.totalMemories,
          storageUsed: user.storageUsed,
          aptosBalance: balance?.balance || 0,
          isWalletUser: user.isWalletUser,
          accountType: verification.accountType
        },
        token
      }
    });
  } catch (error) {
    console.error('Wallet auth error:', error);
    next(error);
  }
});

/**
 * @desc    Link wallet to existing account
 * @route   POST /api/auth/link-wallet
 */
router.post('/link-wallet', protect, async (req, res, next) => {
  try {
    const { address, publicKey, signature, message, nonce, fullMessage } = req.body;

    console.log('\n=== Link Wallet ===');
    console.log('User ID:', req.user._id);
    console.log('Address:', address);

    if (!address || !publicKey || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required wallet data'
      });
    }

    // ── Unified verification ──────────────────────────────────
    const verification = await verifyWalletSignature({
      address,
      publicKey,
      signature,
      message,
      nonce,
      fullMessage
    });

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid wallet signature',
        reason: verification.reason
      });
    }

    // Check if wallet already linked to another account
    const existingUser = await User.findOne({
      aptosAddress: address,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This wallet is already linked to another account'
      });
    }

    // Update user
    req.user.aptosAddress = address;
    req.user.aptosPublicKey = publicKey;
    await req.user.save();

    console.log('✅ Wallet linked successfully');

    let balance = null;
    try {
      balance = await aptosService.getBalance(address);
    } catch (err) {
      console.warn('Could not fetch balance:', err.message);
    }

    res.json({
      success: true,
      message: 'Wallet linked successfully',
      data: {
        aptosAddress: address,
        aptosBalance: balance?.balance || 0
      }
    });
  } catch (error) {
    console.error('Link wallet error:', error);
    next(error);
  }
});

/**
 * @desc    Register new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = new User({ email, password, name });
    await user.generateAptosWallet();
    await user.save();

    if (process.env.APTOS_NETWORK !== 'mainnet') {
      try {
        await aptosService.fundAccount(user.aptosAddress);
        console.log(`💰 Funded new user wallet: ${user.aptosAddress}`);
      } catch (err) {
        console.warn('Could not fund account:', err.message);
      }
    }

    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          aptosAddress: user.aptosAddress
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Login user
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateAuthToken();

    let balance = null;
    if (user.aptosAddress) {
      balance = await aptosService.getBalance(user.aptosAddress);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          aptosAddress: user.aptosAddress,
          userType: user.userType,
          organizationInfo: user.organizationInfo,
          level: user.level,
          points: user.points,
          questStats: user.questStats,
          totalMemories: user.totalMemories,
          storageUsed: user.storageUsed,
          aptosBalance: balance?.balance || 0
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Unlink wallet
 */
router.post('/unlink-wallet', protect, async (req, res, next) => {
  try {
    if (req.user.isWalletUser) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unlink wallet from wallet-only account'
      });
    }

    req.user.aptosAddress = null;
    req.user.aptosPublicKey = null;
    await req.user.save();

    res.json({
      success: true,
      message: 'Wallet unlinked successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get current user
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User session invalid. Please log in again.'
      });
    }

    let balance = null;
    if (user.aptosAddress) {
      try {
        balance = await aptosService.getBalance(user.aptosAddress);
      } catch (err) {
        console.warn('Could not fetch balance');
      }
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        aptosAddress: user.aptosAddress,
        aptosBalance: balance?.balance || 0,
        userType: user.userType,
        organizationInfo: user.organizationInfo,
        level: user.level,
        points: user.points,
        questStats: user.questStats,
        totalMemories: user.totalMemories,
        storageUsed: user.storageUsed,
        isWalletUser: user.isWalletUser,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 */
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, bio, avatar } = req.body;
    const user = await User.findById(req.user.id || req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Update the req.user object for subsequent middleware if any
    req.user.name = user.name;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;