// src/controllers/badgeController.js

import Badge from '../models/Badge.js';
import User from '../models/User.js';
import ipfsService from '../services/ipfsService.js';
import { BADGE_RARITY } from '../config/constants.js';

/**
 * @desc    Create a new badge
 * @route   POST /api/badges
 * @access  Private (Creator/Brand/Admin)
 */
export const createBadge = async (req, res, next) => {
  try {
    const {
      name,
      description,
      imageData,
      imageUrl,
      rarity,
      category,
      tier,
      requirements,
      nftMetadata,
      campaignId,
      pointValue,
      isTransferable,
      isBurnable
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Badge name is required'
      });
    }

    // Upload image to IPFS if base64 provided
    let finalImageUrl = imageUrl;
    if (imageData) {
      const ipfsResult = await ipfsService.pinBase64(
        imageData,
        `badge_${name.replace(/\s+/g, '_')}`,
        { type: 'badge', name }
      );
      finalImageUrl = ipfsResult.gatewayUrl;
    }

    if (!finalImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Badge image is required'
      });
    }

    const badge = await Badge.create({
      name,
      description,
      creatorId: req.user._id,
      campaignId,
      imageUrl: finalImageUrl,
      nftMetadata: {
        isNft: nftMetadata?.isNft || false,
        maxSupply: nftMetadata?.maxSupply || null,
        royaltyPercentage: nftMetadata?.royaltyPercentage || 0,
        attributes: nftMetadata?.attributes || []
      },
      rarity: rarity || BADGE_RARITY.COMMON,
      category: category || 'achievement',
      tier: tier || 1,
      requirements: requirements || {},
      isTransferable: isTransferable !== false,
      isBurnable: isBurnable || false,
      pointValue: pointValue || 0
    });

    console.log('✅ Badge created:', badge._id);

    res.status(201).json({
      success: true,
      message: 'Badge created successfully',
      data: badge
    });

  } catch (error) {
    console.error('Create badge error:', error);
    next(error);
  }
};

/**
 * @desc    Get all badges
 * @route   GET /api/badges
 * @access  Public
 */
export const getBadges = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      rarity,
      category,
      campaignId,
      search
    } = req.query;

    const query = { isActive: true };

    if (rarity) query.rarity = rarity;
    if (category) query.category = category;
    if (campaignId) query.campaignId = campaignId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const allBadges = await Badge.find(query);

    // Manual Sort
    const badgesData = allBadges.sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Manual Pagination
    const paginatedBadges = badgesData.slice((page - 1) * limit, page * limit);

    // Manual Population
    const badges = await Promise.all(paginatedBadges.map(async (badge) => {
      const bObj = JSON.parse(JSON.stringify(badge));
      if (bObj.creatorId) {
        const u = await User.findById(bObj.creatorId);
        if (u) bObj.creatorId = { _id: u._id, name: u.name, organizationInfo: u.organizationInfo };
      }
      if (bObj.campaignId) {
        const c = await Campaign.findById(bObj.campaignId);
        if (c) bObj.campaignId = { _id: c._id, name: c.name };
      }
      return bObj;
    }));

    const total = await Badge.countDocuments(query);

    res.json({
      success: true,
      data: {
        badges,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single badge
 * @route   GET /api/badges/:id
 * @access  Public
 */
export const getBadge = async (req, res, next) => {
  try {
    const badge = await Badge.findById(req.params.id);

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
    }

    const bObj = JSON.parse(JSON.stringify(badge));

    // Manual Population
    if (bObj.creatorId) {
      const u = await User.findById(bObj.creatorId);
      if (u) bObj.creatorId = { _id: u._id, name: u.name, avatar: u.avatar, organizationInfo: u.organizationInfo };
    }
    if (bObj.campaignId) {
      const c = await Campaign.findById(bObj.campaignId);
      if (c) bObj.campaignId = { _id: c._id, name: c.name, description: c.description };
    }
    if (bObj.requirements && bObj.requirements.questId) {
      const q = await Quest.findById(bObj.requirements.questId);
      if (q) bObj.requirements.questId = { _id: q._id, title: q.title, description: q.description };
    }

    // Get recent holders manual
    const allUsers = await User.find({
      'badges.badgeId': badge._id
    });

    const recentHolders = allUsers
      .map(u => ({
        name: u.name,
        avatar: u.avatar,
        awardedAt: u.badges.find(b => b.badgeId.toString() === badge._id.toString())?.awardedAt
      }))
      .filter(u => u.awardedAt)
      .sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        badge: bObj,
        recentHolders
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's badges
 * @route   GET /api/badges/my-badges
 * @access  Private
 */
export const getMyBadges = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const populatedBadges = await Promise.all((user.badges || []).map(async (b) => {
      const bData = await Badge.findById(b.badgeId);
      return {
        badgeId: bData ? {
          _id: bData._id,
          name: bData.name,
          description: bData.description,
          imageUrl: bData.imageUrl,
          rarity: bData.rarity,
          category: bData.category,
          tier: bData.tier,
          pointValue: bData.pointValue
        } : b.badgeId,
        awardedAt: b.awardedAt,
        questCompletionId: b.questCompletionId
      };
    }));

    const badges = populatedBadges.map(b => ({
      ...(typeof b.badgeId === 'object' ? b.badgeId : {}),
      awardedAt: b.awardedAt,
      questCompletionId: b.questCompletionId
    }));

    // Group by rarity
    const byRarity = {
      legendary: badges.filter(b => b.rarity === 'legendary'),
      epic: badges.filter(b => b.rarity === 'epic'),
      rare: badges.filter(b => b.rarity === 'rare'),
      uncommon: badges.filter(b => b.rarity === 'uncommon'),
      common: badges.filter(b => b.rarity === 'common')
    };

    res.json({
      success: true,
      data: {
        badges,
        byRarity,
        totalBadges: badges.length,
        totalPoints: badges.reduce((sum, b) => sum + (b.pointValue || 0), 0)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get badges for a user (public profile)
 * @route   GET /api/badges/user/:userId
 * @access  Public
 */
export const getUserBadges = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const populatedBadges = await Promise.all((user.badges || []).map(async (b) => {
      const bData = await Badge.findById(b.badgeId);
      return {
        badgeId: bData ? {
          _id: bData._id,
          name: bData.name,
          description: bData.description,
          imageUrl: bData.imageUrl,
          rarity: bData.rarity,
          category: bData.category,
          tier: bData.tier
        } : b.badgeId,
        awardedAt: b.awardedAt
      };
    }));

    const badges = populatedBadges.map(b => ({
      ...(typeof b.badgeId === 'object' ? b.badgeId : {}),
      awardedAt: b.awardedAt
    }));

    // Check privacy settings
    if (!user.preferences?.privacy?.showBadges) {
      return res.status(403).json({
        success: false,
        message: 'User has hidden their badges'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          avatar: user.avatar
        },
        badges: badges
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Award badge to user (admin/creator only)
 * @route   POST /api/badges/:id/award
 * @access  Private (Creator/Admin)
 */
export const awardBadge = async (req, res, next) => {
  try {
    const { userId, reason } = req.body;

    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
    }

    // Verify ownership or admin
    if (badge.creatorId.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to award this badge'
      });
    }

    const result = await badge.awardTo(userId);

    console.log('✅ Badge awarded:', badge.name, 'to user:', userId);

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      data: {
        badge: {
          id: badge._id,
          name: badge.name,
          rarity: badge.rarity
        },
        awardedTo: userId,
        reason
      }
    });

  } catch (error) {
    if (error.message === 'User already has this badge') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Get badges created by user
 * @route   GET /api/badges/created
 * @access  Private
 */
export const getCreatedBadges = async (req, res, next) => {
  try {
    const badges = await Badge.find({ creatorId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: badges
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update badge
 * @route   PUT /api/badges/:id
 * @access  Private (Owner only)
 */
export const updateBadge = async (req, res, next) => {
  try {
    const badge = await Badge.findOne({
      _id: req.params.id,
      creatorId: req.user._id
    });

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found or unauthorized'
      });
    }

    const allowedUpdates = [
      'name', 'description', 'rarity', 'category',
      'tier', 'pointValue', 'requirements', 'isActive'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        badge[field] = req.body[field];
      }
    });

    await badge.save();

    res.json({
      success: true,
      message: 'Badge updated successfully',
      data: badge
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete badge
 * @route   DELETE /api/badges/:id
 * @access  Private (Owner only)
 */
export const deleteBadge = async (req, res, next) => {
  try {
    const badge = await Badge.findOne({
      _id: req.params.id,
      creatorId: req.user._id
    });

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found or unauthorized'
      });
    }

    // Check if badge has been awarded
    if (badge.stats.totalAwarded > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete badge that has been awarded. Deactivate instead.'
      });
    }

    await badge.deleteOne();

    res.json({
      success: true,
      message: 'Badge deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get badge leaderboard (most badges)
 * @route   GET /api/badges/leaderboard
 * @access  Public
 */
export const getBadgeLeaderboard = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const allUsers = await User.find({});

    const leaderboard = allUsers
      .filter(u =>
        u.badges && u.badges.length > 0 &&
        u.preferences?.privacy?.showBadges !== false
      )
      .map(u => ({
        _id: u._id,
        name: u.name,
        avatar: u.avatar,
        badgeCount: u.badges.length,
        level: u.level?.current || 1
      }))
      .sort((a, b) => b.badgeCount - a.badgeCount)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: leaderboard
    });

  } catch (error) {
    next(error);
  }
};

export default {
  createBadge,
  getBadges,
  getBadge,
  getMyBadges,
  getUserBadges,
  awardBadge,
  getCreatedBadges,
  updateBadge,
  deleteBadge,
  getBadgeLeaderboard
};