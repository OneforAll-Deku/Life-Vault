import Memory from '../models/Memory.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * @desc    Get comprehensive analytics for the user's memories
 * @route   GET /api/analytics
 * @access  Private
 */
export const getAnalytics = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // ── 1. Overview Stats ──────────────────────────────────────
        const overviewPipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalMemories: { $sum: 1 },
                    totalSize: { $sum: { $ifNull: ['$fileSize', 0] } },
                    onChainCount: { $sum: { $cond: ['$isOnChain', 1, 0] } },
                    offChainCount: { $sum: { $cond: ['$isOnChain', 0, 1] } },
                    encryptedCount: { $sum: { $cond: ['$isEncrypted', 1, 0] } },
                    capsuleCount: { $sum: { $cond: ['$isCapsule', 1, 0] } },
                    sharedCount: {
                        $sum: {
                            $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedWith', []] } }, 0] }, 1, 0]
                        }
                    },
                    oldestMemory: { $min: '$createdAt' },
                    newestMemory: { $max: '$createdAt' },
                },
            },
        ];
        const overviewResult = await Memory.aggregate(overviewPipeline);
        const overview = overviewResult[0] || {
            totalMemories: 0,
            totalSize: 0,
            onChainCount: 0,
            offChainCount: 0,
            encryptedCount: 0,
            capsuleCount: 0,
            sharedCount: 0,
            oldestMemory: null,
            newestMemory: null,
        };

        // ── 2. Category Breakdown (Pie chart) ──────────────────────
        const categoryPipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalSize: { $sum: { $ifNull: ['$fileSize', 0] } },
                },
            },
            { $sort: { count: -1 } },
        ];
        const categoryBreakdown = await Memory.aggregate(categoryPipeline);

        // ── 3. Monthly Timeline (Area/Line chart) ──────────────────
        const timelinePipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    count: { $sum: 1 },
                    size: { $sum: { $ifNull: ['$fileSize', 0] } },
                    onChain: { $sum: { $cond: ['$isOnChain', 1, 0] } },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ];
        const timelineRaw = await Memory.aggregate(timelinePipeline);

        // Fill in missing months for the last 12 months
        const timeline = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const existing = timelineRaw.find(
                (t) => t._id.year === year && t._id.month === month
            );
            timeline.push({
                month: d.toLocaleString('en-US', { month: 'short' }),
                year,
                monthNum: month,
                count: existing?.count || 0,
                size: existing?.size || 0,
                onChain: existing?.onChain || 0,
            });
        }

        // ── 4. Weekly Timeline (last 8 weeks) ──────────────────────
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const weeklyPipeline = [
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    createdAt: { $gte: eightWeeksAgo },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $isoWeekYear: '$createdAt' },
                        week: { $isoWeek: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } },
        ];
        const weeklyTimeline = await Memory.aggregate(weeklyPipeline);

        // ── 5. Activity Heatmap (last 365 days) ────────────────────
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        oneYearAgo.setHours(0, 0, 0, 0);

        const heatmapPipeline = [
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    createdAt: { $gte: oneYearAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ];
        const heatmapRaw = await Memory.aggregate(heatmapPipeline);

        // Build full 365-day heatmap with zero-fills
        const heatmap = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const heatmapMap = {};
        heatmapRaw.forEach((h) => {
            heatmapMap[h._id] = h.count;
        });
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            heatmap.push({
                date: key,
                count: heatmapMap[key] || 0,
                dayOfWeek: d.getDay(), // 0=Sun, 6=Sat
            });
        }

        // ── 6. File Type Distribution ──────────────────────────────
        const fileTypePipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: [{ $ifNull: ['$fileType', null] }, null] },
                            'unknown',
                            { $arrayElemAt: [{ $split: ['$fileType', '/'] }, 0] },
                        ],
                    },
                    count: { $sum: 1 },
                    totalSize: { $sum: { $ifNull: ['$fileSize', 0] } },
                },
            },
            { $sort: { count: -1 } },
        ];
        const fileTypeBreakdown = await Memory.aggregate(fileTypePipeline);

        // ── 7. Streaks & Milestones ────────────────────────────────
        // Calculate current upload streak (consecutive days with uploads)
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let lastDate = null;

        for (let i = heatmap.length - 1; i >= 0; i--) {
            if (heatmap[i].count > 0) {
                if (lastDate === null || i === heatmap.length - 1) {
                    tempStreak = 1;
                    lastDate = heatmap[i].date;
                }
            } else {
                if (currentStreak === 0 && tempStreak > 0) {
                    currentStreak = tempStreak;
                }
                break;
            }

            if (i < heatmap.length - 1 && heatmap[i].count > 0) {
                tempStreak++;
            }
        }
        if (currentStreak === 0) currentStreak = tempStreak;

        // Calculate longest streak from heatmap
        tempStreak = 0;
        for (const day of heatmap) {
            if (day.count > 0) {
                tempStreak++;
                if (tempStreak > longestStreak) longestStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        }

        // ── 8. Growth Rate ─────────────────────────────────────────
        const thisMonth = timeline[timeline.length - 1]?.count || 0;
        const lastMonth = timeline[timeline.length - 2]?.count || 0;
        const growthRate =
            lastMonth > 0
                ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
                : thisMonth > 0
                    ? 100
                    : 0;

        // ── Response ──────────────────────────────────────────────
        res.json({
            success: true,
            data: {
                overview: {
                    ...overview,
                    verificationRate:
                        overview.totalMemories > 0
                            ? Math.round((overview.onChainCount / overview.totalMemories) * 100)
                            : 0,
                    encryptionRate:
                        overview.totalMemories > 0
                            ? Math.round((overview.encryptedCount / overview.totalMemories) * 100)
                            : 0,
                },
                categoryBreakdown,
                fileTypeBreakdown,
                timeline,
                weeklyTimeline,
                heatmap,
                streaks: {
                    currentStreak,
                    longestStreak,
                },
                growthRate,
            },
        });
    } catch (error) {
        console.error('Analytics error:', error);
        next(error);
    }
};
