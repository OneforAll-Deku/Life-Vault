// src/controllers/storyController.js

import Story from '../models/Story.js';
import StoryChapter from '../models/StoryChapter.js';
import User from '../models/User.js';
import Memory from '../models/Memory.js';
import ipfsService from '../services/ipfsService.js';
import encryptionService from '../services/encryptionService.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * @desc    Create a new story
 * @route   POST /api/stories
 * @access  Private
 */
export const createStory = async (req, res, next) => {
  try {
    const {
      title,
      description,
      recipients,
      isPublic,
      settings,
      coverImage,
      occasion,
      tags,
      isCollaborative,
      isInteractive,
      coAuthors
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Generate encryption key for private stories
    let encryptionKey = null;
    if (!isPublic) {
      encryptionKey = crypto.randomBytes(32).toString('hex');
    }

    // Process recipients
    const processedRecipients = [];
    if (recipients && recipients.length > 0) {
      for (const recipient of recipients) {
        const recipientData = {
          name: recipient.name,
          email: recipient.email?.toLowerCase?.()?.trim(),
          phone: recipient.phone,
          currentChapter: 0
        };

        // If email provided, try to find existing user
        if (recipientData.email) {
          const existingUser = await User.findOne({
            email: recipientData.email
          });
          if (existingUser) {
            recipientData.userId = existingUser._id;
          }
        }

        processedRecipients.push(recipientData);
      }
    }

    const story = await Story.create({
      title,
      description,
      creatorId: req.user._id,
      recipients: processedRecipients,
      isPublic: isPublic || false,
      settings: {
        allowSkipChapters: settings?.allowSkipChapters || false,
        showChapterTitles: settings?.showChapterTitles !== false,
        notifyOnUnlock: settings?.notifyOnUnlock !== false,
        theme: settings?.theme || 'memory',
        customTheme: settings?.customTheme || {},
        // ── Store creator grace period info ──
        creatorGracePeriod: settings?.creatorGracePeriod || 1,
        creatorAccessUntil: settings?.creatorAccessUntil || null,
      },
      coverImage,
      isEncrypted: !isPublic,
      encryptionKey,
      status: 'draft',
      occasion,
      tags: tags || [],
      isCollaborative: !!isCollaborative,
      isInteractive: !!isInteractive,
      coAuthors: coAuthors || []
    });

    // Update user's created stories
    await User.findByIdAndUpdate(req.user._id, {
      $push: { storiesCreated: story._id }
    });

    console.log('✅ Story created:', story._id);

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      data: {
        story: {
          ...story.toObject(),
          encryptionKey: undefined
        },
        shortCode: story.shortCode
      }
    });
  } catch (error) {
    console.error('Create story error:', error);
    next(error);
  }
};

/**
 * @desc    Add a chapter to a story
 * @route   POST /api/stories/:storyId/chapters
 * @access  Private (Owner only)
 */
export const addChapter = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const {
      title,
      subtitle,
      content,
      unlockConditions,
      hint,
      theme,
      order,
      parentId,
      choices
    } = req.body;

    // Find story and verify ownership
    const story = await Story.findOne({
      _id: storyId,
      $or: [
        { creatorId: req.user._id },
        { 'coAuthors.userId': req.user._id }
      ]
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found or unauthorized'
      });
    }

    // Determine chapter number
    const chapterNumber = order || story.chapters.length + 1;

    // Process content
    let processedContent = { ...content };

    // If content includes media, upload to IPFS
    if (content.mediaData) {
      try {
        const ipfsResult = await ipfsService.pinBase64(
          content.mediaData,
          `chapter_${storyId}_${chapterNumber}`,
          { storyId, chapterNumber }
        );
        processedContent.mediaIpfsHash = ipfsResult.ipfsHash;
        processedContent.mediaUrl = ipfsResult.gatewayUrl;
      } catch (ipfsError) {
        console.warn('IPFS upload failed, storing inline:', ipfsError.message);
        // Keep mediaData as fallback if IPFS fails
        processedContent.mediaUrl = content.mediaData;
      }
      delete processedContent.mediaData;
    }

    // If linking to existing memory
    if (content.memoryId) {
      const memory = await Memory.findOne({
        _id: content.memoryId,
        userId: req.user._id
      });
      if (!memory) {
        return res.status(404).json({
          success: false,
          message: 'Memory not found'
        });
      }
      processedContent.mediaIpfsHash = memory.ipfsHash;
      processedContent.mediaUrl = memory.ipfsUrl;
    }

    // Encrypt content if story is encrypted
    if (story.isEncrypted && processedContent.text) {
      const storyWithKey = await Story.findById(storyId).select('+encryptionKey');
      processedContent.encryptedData = encryptionService.encrypt(
        processedContent.text,
        storyWithKey.encryptionKey
      );
      delete processedContent.text;
    }

    // Process unlock conditions
    const processedConditions = { ...unlockConditions };

    // Hash QR code if provided
    if (unlockConditions?.qrCode?.enabled && unlockConditions.qrCode.code) {
      processedConditions.qrCode.codeHash = crypto
        .createHash('sha256')
        .update(unlockConditions.qrCode.code)
        .digest('hex');
      delete processedConditions.qrCode.code;
    }

    // Hash password if provided
    if (unlockConditions?.password?.enabled && unlockConditions.password.value) {
      const salt = await bcrypt.genSalt(10);
      processedConditions.password.hash = await bcrypt.hash(
        unlockConditions.password.value,
        salt
      );
      delete processedConditions.password.value;
    }

    // Determine workflow status
    const isOwner = story.creatorId.toString() === req.user._id.toString();
    const isEditor = story.coAuthors.some(ca => ca.userId.toString() === req.user._id.toString() && ca.role === 'editor');

    // Auto-approve if owner, editor, or if approval isn't required
    const status = (isOwner || isEditor || !story.settings?.requireApproval) ? 'approved' : 'pending';

    // Create chapter
    const chapter = await StoryChapter.create({
      storyId,
      chapterNumber,
      authorId: req.user._id,
      status,
      parentId,
      choices: choices || [],
      title,
      subtitle,
      content: processedContent,
      unlockConditions: processedConditions,
      hint,
      theme,
      order: chapterNumber,
      versions: [{
        content: processedContent,
        authorId: req.user._id,
        commitMessage: 'Initial version'
      }]
    });

    // Update story
    story.chapters.push(chapter._id);
    story.totalChapters = story.chapters.length;
    await story.save();

    console.log('✅ Chapter added:', chapter._id, 'to story:', storyId);

    res.status(201).json({
      success: true,
      message: 'Chapter added successfully',
      data: {
        chapter: {
          ...chapter.toObject(),
          unlockConditions: {
            ...chapter.unlockConditions,
            qrCode: chapter.unlockConditions?.qrCode
              ? {
                ...chapter.unlockConditions.qrCode,
                code: undefined
              }
              : undefined,
            password: chapter.unlockConditions?.password
              ? {
                enabled: chapter.unlockConditions.password.enabled,
                hint: chapter.unlockConditions.password.hint
              }
              : undefined
          }
        }
      }
    });
  } catch (error) {
    console.error('Add chapter error:', error);
    next(error);
  }
};

/**
 * Helper: determine user's role relative to a story
 */
function getUserRole(story, userId, userEmail) {
  const creatorId =
    story.creatorId?._id?.toString?.() ||
    story.creatorId?.toString?.();

  const isCreator = creatorId === userId.toString();

  const isRecipient = (story.recipients || []).some(
    (r) =>
      r.userId?.toString() === userId.toString() ||
      (r.email && userEmail && r.email.toLowerCase() === userEmail.toLowerCase())
  );

  return { isCreator, isRecipient };
}

/**
 * @desc    Get story (with progress for recipient)
 * @route   GET /api/stories/:id
 * @access  Private (Creator or Recipient)
 */
export const getStory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const story = await Story.findById(id)
      .populate('creatorId', 'name email avatar')
      .populate('chapters');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    const { isCreator, isRecipient } = getUserRole(
      story,
      req.user._id,
      req.user.email
    );

    if (!story.isPublic && !isCreator && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this story'
      });
    }

    // ── Build chapter data with unlock status ──
    const chaptersWithStatus = (story.chapters || []).map((ch) => {
      const chObj = ch.toObject ? ch.toObject() : ch;

      // Check if this user unlocked it
      const userUnlock = (chObj.unlockedBy || []).find(
        (u) => u.userId?.toString() === req.user._id.toString()
      );

      // Creator can always see their own chapters' metadata
      // but content is only visible if unlocked or within grace period
      const isUnlocked = !!userUnlock;

      const graceUntil = story.settings?.creatorAccessUntil;
      const inGracePeriod =
        isCreator && graceUntil && new Date() < new Date(graceUntil);

      // Show content if unlocked OR creator within grace period
      const showContent = isUnlocked || inGracePeriod;

      return {
        _id: chObj._id,
        chapterNumber: chObj.chapterNumber,
        title: chObj.title,
        subtitle: chObj.subtitle,
        order: chObj.order,
        isUnlocked,
        unlockedAt: userUnlock?.unlockedAt || null,
        authorId: chObj.authorId,
        status: chObj.status,
        parentId: chObj.parentId,
        choices: chObj.choices,
        // Only include content if accessible
        content: showContent ? chObj.content : undefined,
        // Always show conditions so UI can display lock status
        unlockConditions: {
          requirePreviousChapter: chObj.unlockConditions?.requirePreviousChapter,
          location: chObj.unlockConditions?.location
            ? {
              enabled: chObj.unlockConditions.location.enabled,
              name: chObj.unlockConditions.location.name,
              coordinates: chObj.unlockConditions.location.coordinates,
              radiusMeters: chObj.unlockConditions.location.radiusMeters
            }
            : undefined,
          time: chObj.unlockConditions?.time
            ? {
              enabled: chObj.unlockConditions.time.enabled,
              unlockAt: chObj.unlockConditions.time.unlockAt
            }
            : undefined,
          // Don't expose QR/password hashes
          qrCode: chObj.unlockConditions?.qrCode
            ? { enabled: chObj.unlockConditions.qrCode.enabled }
            : undefined,
          password: chObj.unlockConditions?.password
            ? {
              enabled: chObj.unlockConditions.password.enabled,
              hint: chObj.unlockConditions.password.hint
            }
            : undefined
        },
        hint: chObj.hint,
        stats: chObj.stats
      };
    });

    // Sort by order
    chaptersWithStatus.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Get progress for recipient
    let progress = null;
    if (isRecipient && story.getProgressForUser) {
      try {
        progress = await story.getProgressForUser(req.user._id);
      } catch {
        // model method might not exist
      }
    }

    res.json({
      success: true,
      data: {
        story: {
          _id: story._id,
          title: story.title,
          description: story.description,
          shortCode: story.shortCode,
          status: story.status,
          isPublic: story.isPublic,
          occasion: story.occasion,
          tags: story.tags,
          coverImage: story.coverImage,
          totalChapters: story.totalChapters,
          isCollaborative: story.isCollaborative,
          isInteractive: story.isInteractive,
          coAuthors: story.coAuthors,
          settings: {
            ...story.settings,
            // Only expose grace period to creator
            creatorAccessUntil: isCreator
              ? story.settings?.creatorAccessUntil
              : undefined
          },
          creator: story.creatorId,
          recipients: isCreator
            ? story.recipients
            : story.recipients?.map((r) => ({
              name: r.name,
              currentChapter: r.currentChapter
            })),
          chapters: chaptersWithStatus,
          createdAt: story.createdAt,
          activatedAt: story.activatedAt
        },
        progress,
        isCreator,
        isRecipient
      }
    });
  } catch (error) {
    console.error('Get story error:', error);
    next(error);
  }
};

/**
 * @desc    Get story by short code
 * @route   GET /api/stories/code/:shortCode
 * @access  Public (but content may be locked)
 */
export const getStoryByCode = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    const story = await Story.findOne({ shortCode })
      .populate('creatorId', 'name avatar')
      .select('-encryptionKey');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // If user is authenticated, return full story data
    if (req.user) {
      const { isCreator, isRecipient } = getUserRole(
        story,
        req.user._id,
        req.user.email
      );

      if (story.isPublic || isCreator || isRecipient) {
        // Redirect to full story endpoint logic
        req.params.id = story._id.toString();
        return getStory(req, res, next);
      }
    }

    // Basic public info
    res.json({
      success: true,
      data: {
        story: {
          _id: story._id,
          id: story._id,
          title: story.title,
          description: story.description,
          coverImage: story.coverImage,
          totalChapters: story.totalChapters,
          creator: story.creatorId,
          occasion: story.occasion,
          isPublic: story.isPublic,
          status: story.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Attempt to unlock a chapter
 * @route   POST /api/stories/:storyId/chapters/:chapterNumber/unlock
 * @access  Private (Creator OR Recipient)
 *
 * ── THIS WAS THE BUG: creator was not allowed to unlock ──
 */
export const unlockChapter = async (req, res, next) => {
  try {
    const { storyId, chapterNumber } = req.params;
    const { latitude, longitude, qrCode, password } = req.body;

    // Find story
    const story = await Story.findById(storyId).select('+encryptionKey');
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // ── FIX: Check both creator AND recipient ──
    const { isCreator, isRecipient } = getUserRole(
      story,
      req.user._id,
      req.user.email
    );

    if (!story.isPublic && !isCreator && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this story'
      });
    }

    // Find chapter
    const chapter = await StoryChapter.findOne({
      storyId,
      chapterNumber: parseInt(chapterNumber)
    }).select(
      '+unlockConditions.qrCode.code +unlockConditions.qrCode.codeHash +unlockConditions.password.hash'
    );

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    // Check if already unlocked by this user
    const existingUnlock = (chapter.unlockedBy || []).find(
      (u) => u.userId?.toString() === req.user._id.toString()
    );

    if (existingUnlock) {
      // Already unlocked — return content directly
      const content = await getChapterContent(chapter, story);
      return res.json({
        success: true,
        message: 'Chapter already unlocked',
        data: {
          chapter: {
            ...chapter.toObject(),
            isUnlocked: true,
            unlockedAt: existingUnlock.unlockedAt,
            unlockConditions: undefined
          },
          content
        }
      });
    }

    // ── Evaluate unlock conditions ──
    const checks = [];
    let allPassed = true;

    // 1) Time check
    const timeCond = chapter.unlockConditions?.time;
    if (timeCond?.enabled && timeCond?.unlockAt) {
      const unlockDate = new Date(timeCond.unlockAt);
      const timePassed = new Date() >= unlockDate;
      checks.push({
        type: 'time',
        passed: timePassed,
        message: timePassed
          ? 'Time condition met'
          : `Too early. Unlocks at ${unlockDate.toISOString()}`
      });
      if (!timePassed) allPassed = false;
    }

    // 2) Location check
    const locCond = chapter.unlockConditions?.location;
    if (locCond?.enabled && locCond?.coordinates?.coordinates) {
      if (latitude == null || longitude == null) {
        checks.push({
          type: 'location',
          passed: false,
          message: 'Location data is required. Please enable GPS.'
        });
        allPassed = false;
      } else {
        const [targetLon, targetLat] = locCond.coordinates.coordinates;
        const distance = haversineDistance(
          latitude,
          longitude,
          targetLat,
          targetLon
        );
        const radius = locCond.radiusMeters || 80;
        const locationPassed = distance <= radius;
        checks.push({
          type: 'location',
          passed: locationPassed,
          distance: Math.round(distance),
          radius,
          message: locationPassed
            ? `Within range (${Math.round(distance)}m)`
            : `Too far away: ${Math.round(distance)}m (need ≤${radius}m)`
        });
        if (!locationPassed) allPassed = false;
      }
    }

    // 3) QR code check
    const qrCond = chapter.unlockConditions?.qrCode;
    if (qrCond?.enabled) {
      if (!qrCode) {
        checks.push({
          type: 'qrCode',
          passed: false,
          message: 'QR code scan is required'
        });
        allPassed = false;
      } else {
        const scannedHash = crypto
          .createHash('sha256')
          .update(qrCode)
          .digest('hex');
        const qrPassed = scannedHash === qrCond.codeHash;
        checks.push({
          type: 'qrCode',
          passed: qrPassed,
          message: qrPassed ? 'QR code matched' : 'Wrong QR code'
        });
        if (!qrPassed) allPassed = false;
      }
    }

    // 4) Password check
    const pwCond = chapter.unlockConditions?.password;
    if (pwCond?.enabled && pwCond?.hash) {
      if (!password) {
        checks.push({
          type: 'password',
          passed: false,
          message: 'Password is required'
        });
        allPassed = false;
      } else {
        const pwPassed = await bcrypt.compare(password, pwCond.hash);
        checks.push({
          type: 'password',
          passed: pwPassed,
          message: pwPassed ? 'Password correct' : 'Wrong password'
        });
        if (!pwPassed) allPassed = false;
      }
    }

    // 5) Previous chapter check
    if (chapter.unlockConditions?.requirePreviousChapter) {
      const prevNum = parseInt(chapterNumber) - 1;
      if (prevNum >= 1) {
        const prevChapter = await StoryChapter.findOne({
          storyId,
          chapterNumber: prevNum
        });
        const prevUnlocked =
          prevChapter &&
          (prevChapter.unlockedBy || []).some(
            (u) => u.userId?.toString() === req.user._id.toString()
          );
        checks.push({
          type: 'previousChapter',
          passed: !!prevUnlocked,
          message: prevUnlocked
            ? 'Previous chapter unlocked'
            : `You must unlock Chapter ${prevNum} first`
        });
        if (!prevUnlocked) allPassed = false;
      }
    }

    // Track attempt
    chapter.stats = chapter.stats || { unlockAttempts: 0, views: 0 };
    chapter.stats.unlockAttempts += 1;
    await chapter.save();

    if (!allPassed) {
      const failedChecks = checks.filter((c) => !c.passed);
      return res.status(400).json({
        success: false,
        message: failedChecks.map((c) => c.message).join('. '),
        data: { checks }
      });
    }

    // ── All conditions passed — unlock! ──
    chapter.unlockedBy = chapter.unlockedBy || [];
    chapter.unlockedBy.push({
      userId: req.user._id,
      unlockedAt: new Date(),
      method: checks.map((c) => c.type).join(',')
    });
    await chapter.save();

    // Update recipient progress on the story
    const recipientIndex = (story.recipients || []).findIndex(
      (r) =>
        r.userId?.toString() === req.user._id.toString() ||
        (r.email &&
          req.user.email &&
          r.email.toLowerCase() === req.user.email.toLowerCase())
    );
    if (recipientIndex !== -1) {
      const currentProgress =
        story.recipients[recipientIndex].currentChapter || 0;
      const chNum = parseInt(chapterNumber);
      if (chNum > currentProgress) {
        story.recipients[recipientIndex].currentChapter = chNum;
        await story.save();
      }
    }

    // Get decrypted content
    const content = await getChapterContent(chapter, story);

    console.log(
      '✅ Chapter',
      chapterNumber,
      'unlocked by user',
      req.user._id,
      isCreator ? '(creator)' : '(recipient)'
    );

    res.json({
      success: true,
      message: 'Chapter unlocked!',
      data: {
        chapter: {
          ...chapter.toObject(),
          isUnlocked: true,
          unlockConditions: undefined
        },
        content,
        checks
      }
    });
  } catch (error) {
    console.error('Unlock chapter error:', error);
    next(error);
  }
};

// In storyController.js — getMyStories
export const getMyStories = async (req, res, next) => {
  try {
    const stories = await Story.find({ creatorId: req.user._id })
      .populate('chapters')
      .sort({ createdAt: -1 });

    const storiesWithStatus = stories.map((story) => {
      const storyObj = story.toObject();

      storyObj.chapters = (storyObj.chapters || []).map((ch) => {
        const userUnlock = (ch.unlockedBy || []).find(
          (u) => u.userId?.toString() === req.user._id.toString()
        );
        return {
          _id: ch._id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          subtitle: ch.subtitle,
          order: ch.order,
          isUnlocked: !!userUnlock,
          unlockedAt: userUnlock?.unlockedAt || null,
          unlockConditions: {
            location: ch.unlockConditions?.location
              ? {
                enabled: ch.unlockConditions.location.enabled,
                name: ch.unlockConditions.location.name,
                radiusMeters: ch.unlockConditions.location.radiusMeters,
                coordinates: ch.unlockConditions.location.coordinates,
              }
              : undefined,
            time: ch.unlockConditions?.time
              ? {
                enabled: ch.unlockConditions.time.enabled,
                unlockAt: ch.unlockConditions.time.unlockAt,
              }
              : undefined,
          },
          hint: ch.hint,
        };
      });

      storyObj.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));

      return {
        ...storyObj,
        encryptionKey: undefined,
      };
    });

    // ── CONSISTENT: return array directly in data ──
    res.json({
      success: true,
      data: storiesWithStatus  // ← Array directly, NOT { stories: [...] }
    });
  } catch (error) {
    console.error('Get my stories error:', error);
    next(error);
  }
};

/**
 * @desc    Get stories received by user
 * @route   GET /api/stories/received
 * @access  Private
 */
export const getReceivedStories = async (req, res, next) => {
  try {
    const query = {
      $or: [{ 'recipients.userId': req.user._id }],
    };

    if (req.user.email) {
      query.$or.push({
        'recipients.email': req.user.email.toLowerCase(),
      });
    }

    const stories = await Story.find(query)
      .populate('creatorId', 'name email avatar')
      .populate('chapters')
      .sort({ createdAt: -1 });

    const storiesWithStatus = stories.map((story) => {
      const storyObj = story.toObject();

      storyObj.chapters = (storyObj.chapters || []).map((ch) => {
        const userUnlock = (ch.unlockedBy || []).find(
          (u) => u.userId?.toString() === req.user._id.toString()
        );
        return {
          _id: ch._id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          subtitle: ch.subtitle,
          order: ch.order,
          isUnlocked: !!userUnlock,
          unlockedAt: userUnlock?.unlockedAt || null,
          content: userUnlock ? ch.content : undefined,
          unlockConditions: {
            location: ch.unlockConditions?.location
              ? {
                enabled: ch.unlockConditions.location.enabled,
                name: ch.unlockConditions.location.name,
                radiusMeters: ch.unlockConditions.location.radiusMeters,
                coordinates: ch.unlockConditions.location.coordinates,
              }
              : undefined,
            time: ch.unlockConditions?.time
              ? {
                enabled: ch.unlockConditions.time.enabled,
                unlockAt: ch.unlockConditions.time.unlockAt,
              }
              : undefined,
          },
          hint: ch.hint,
        };
      });

      storyObj.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));

      const recipient = (storyObj.recipients || []).find(
        (r) =>
          r.userId?.toString() === req.user._id.toString() ||
          (r.email &&
            req.user.email &&
            r.email.toLowerCase() === req.user.email.toLowerCase())
      );

      return {
        ...storyObj,
        encryptionKey: undefined,
        progress: {
          currentChapter: recipient?.currentChapter || 0,
          totalChapters: storyObj.totalChapters || storyObj.chapters.length,
        },
      };
    });

    // ── CONSISTENT: return array directly in data ──
    res.json({
      success: true,
      data: storiesWithStatus  // ← Array directly
    });
  } catch (error) {
    console.error('Get received stories error:', error);
    next(error);
  }
};

/**
 * @desc    Update story
 * @route   PUT /api/stories/:id
 * @access  Private (Owner only)
 */
export const updateStory = async (req, res, next) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      creatorId: req.user._id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found or unauthorized'
      });
    }

    const allowedUpdates = [
      'title',
      'description',
      'settings',
      'coverImage',
      'backgroundMusic',
      'tags',
      'occasion'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        story[field] = req.body[field];
      }
    });

    await story.save();

    res.json({
      success: true,
      message: 'Story updated successfully',
      data: story
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Activate story (make it live)
 * @route   PATCH /api/stories/:id/activate
 * @access  Private (Owner only)
 */
export const activateStory = async (req, res, next) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      creatorId: req.user._id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found or unauthorized'
      });
    }

    if (story.chapters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate story without chapters'
      });
    }

    story.status = 'active';
    story.activatedAt = new Date();
    await story.save();

    console.log('✅ Story activated:', story._id);

    res.json({
      success: true,
      message: 'Story activated',
      data: story
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add recipient to story
 * @route   POST /api/stories/:id/recipients
 * @access  Private (Owner only)
 */
export const addRecipient = async (req, res, next) => {
  try {
    const { email, name, phone } = req.body;

    const story = await Story.findOne({
      _id: req.params.id,
      creatorId: req.user._id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found or unauthorized'
      });
    }

    const normalizedEmail = email?.toLowerCase?.()?.trim();

    // Check if already a recipient
    const exists = story.recipients.some(
      (r) => r.email?.toLowerCase() === normalizedEmail
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'This person is already a recipient'
      });
    }

    // Find user if exists
    const user = normalizedEmail
      ? await User.findOne({ email: normalizedEmail })
      : null;

    story.recipients.push({
      userId: user?._id,
      email: normalizedEmail,
      name,
      phone,
      inviteSentAt: new Date(),
      currentChapter: 0
    });

    await story.save();

    // Add to user's received stories if user exists
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: {
          storiesReceived: {
            storyId: story._id,
            receivedAt: new Date()
          }
        }
      });
    }

    res.json({
      success: true,
      message: 'Recipient added successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete story
 * @route   DELETE /api/stories/:id
 * @access  Private (Owner only)
 */
export const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      creatorId: req.user._id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found or unauthorized'
      });
    }

    // Delete all chapters
    await StoryChapter.deleteMany({ storyId: story._id });

    // Remove from user's created stories
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { storiesCreated: story._id }
    });

    await story.deleteOne();

    res.json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update chapter status (Approve/Reject)
 * @route   PATCH /api/stories/:storyId/chapters/:chapterId/status
 * @access  Private (Owner/Editor only)
 */
export const updateChapterStatus = async (req, res, next) => {
  try {
    const { storyId, chapterId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    const isOwner = story.creatorId.toString() === req.user._id.toString();
    const isEditor = story.coAuthors.some(ca => ca.userId.toString() === req.user._id.toString() && ca.role === 'editor');

    if (!isOwner && !isEditor) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const chapter = await StoryChapter.findById(chapterId);
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });

    chapter.status = status;
    await chapter.save();

    res.json({ success: true, message: `Chapter status updated to ${status}`, data: chapter });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chapter version history
 * @route   GET /api/stories/:storyId/chapters/:chapterId/history
 * @access  Private (Collaborators/Owner)
 */
export const getChapterHistory = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const chapter = await StoryChapter.findById(chapterId).populate('versions.authorId', 'name avatar');
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });

    res.json({ success: true, data: chapter.versions });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add new version to chapter
 * @route   POST /api/stories/:storyId/chapters/:chapterId/versions
 * @access  Private (Collaborators/Owner)
 */
export const addChapterVersion = async (req, res, next) => {
  try {
    const { storyId, chapterId } = req.params;
    const { content, commitMessage } = req.body;

    const story = await Story.findOne({
      _id: storyId,
      $or: [
        { creatorId: req.user._id },
        { 'coAuthors.userId': req.user._id }
      ]
    });

    if (!story) return res.status(404).json({ success: false, message: 'Story not found or unauthorized' });

    const chapter = await StoryChapter.findById(chapterId);
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });

    // Enforce approval if not owner/editor
    const isOwner = story.creatorId.toString() === req.user._id.toString();
    const isEditor = story.coAuthors.some(ca => ca.userId.toString() === req.user._id.toString() && ca.role === 'editor');

    // Create new version
    const newVersion = {
      content,
      authorId: req.user._id,
      commitMessage: commitMessage || `Updated by ${req.user.name}`,
      createdAt: new Date()
    };

    chapter.versions.push(newVersion);

    // If collaborator (not owner/editor) updates, might want to set status back to pending
    if (!isOwner && !isEditor && story.settings?.requireApproval) {
      chapter.status = 'pending';
    }

    // Update current content
    chapter.content = content;
    await chapter.save();

    res.json({ success: true, message: 'New version added', data: chapter });
  } catch (error) {
    next(error);
  }
};

// ── Helper: Haversine distance in meters ──
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Helper: get decrypted chapter content ──
async function getChapterContent(chapter, story) {
  const content = { ...(chapter.content || {}) };

  // Decrypt text if encrypted
  if (content.encryptedData && story.encryptionKey) {
    try {
      content.text = encryptionService.decrypt(
        content.encryptedData,
        story.encryptionKey
      );
    } catch (err) {
      console.warn('Decryption failed:', err.message);
    }
    delete content.encryptedData;
  }

  return content;
}

export default {
  createStory,
  addChapter,
  getStory,
  getStoryByCode,
  unlockChapter,
  getMyStories,
  getReceivedStories,
  updateStory,
  activateStory,
  addRecipient,
  deleteStory,
  updateChapterStatus,
  getChapterHistory,
  addChapterVersion
};