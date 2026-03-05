import Memory from '../models/Memory.js';
import User from '../models/User.js';

/**
 * @desc    Get comprehensive analytics for the user's memories
 * @route   GET /api/analytics
 * @access  Private
 */
export const getAnalytics = async (req, res, next) => {
    try {
        const userId = req.user._id.toString();

        // Get all memories for this user
        const allMemories = await Memory.find({ userId });

        // ── 1. Overview Stats ──────────────────────────────────────
        const overview = {
            totalMemories: allMemories.length,
            totalSize: 0,
            onChainCount: 0,
            offChainCount: 0,
            encryptedCount: 0,
            capsuleCount: 0,
            sharedCount: 0,
            oldestMemory: null,
            newestMemory: null,
        };

        allMemories.forEach(m => {
            overview.totalSize += m.fileSize || 0;
            if (m.isOnChain) overview.onChainCount++;
            else overview.offChainCount++;
            if (m.isEncrypted) overview.encryptedCount++;
            if (m.isCapsule) overview.capsuleCount++;
            if (m.sharedWith && m.sharedWith.length > 0) overview.sharedCount++;

            const createdAt = new Date(m.createdAt);
            if (!overview.oldestMemory || createdAt < new Date(overview.oldestMemory)) overview.oldestMemory = m.createdAt;
            if (!overview.newestMemory || createdAt > new Date(overview.newestMemory)) overview.newestMemory = m.createdAt;
        });

        // ── 2. Category Breakdown ──────────────────────────────────
        const cats = {};
        allMemories.forEach(m => {
            const cat = m.category || 'uncategorized';
            if (!cats[cat]) cats[cat] = { _id: cat, count: 0, totalSize: 0 };
            cats[cat].count++;
            cats[cat].totalSize += m.fileSize || 0;
        });
        const categoryBreakdown = Object.values(cats).sort((a, b) => b.count - a.count);

        // ── 3. Monthly Timeline ────────────────────────────────────
        const timeline = [];
        const now = new Date();
        const timelineRaw = {};

        allMemories.forEach(m => {
            const d = new Date(m.createdAt);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            if (!timelineRaw[key]) timelineRaw[key] = { count: 0, size: 0, onChain: 0 };
            timelineRaw[key].count++;
            timelineRaw[key].size += m.fileSize || 0;
            if (m.isOnChain) timelineRaw[key].onChain++;
        });

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const key = `${year}-${month}`;
            const existing = timelineRaw[key];

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
        const weeklyTimeline = []; // Placeholder or same simple logic if needed

        // ── 5. Activity Heatmap ────────────────────────────────────
        const heatmap = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const heatmapMap = {};

        allMemories.forEach(m => {
            const d = new Date(m.createdAt);
            const key = d.toISOString().split('T')[0];
            heatmapMap[key] = (heatmapMap[key] || 0) + 1;
        });

        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            heatmap.push({
                date: key,
                count: heatmapMap[key] || 0,
                dayOfWeek: d.getDay(),
            });
        }

        // ── 6. File Type Distribution ──────────────────────────────
        const ftDist = {};
        allMemories.forEach(m => {
            let type = 'unknown';
            if (m.fileType) type = m.fileType.split('/')[0];
            if (!ftDist[type]) ftDist[type] = { _id: type, count: 0, totalSize: 0 };
            ftDist[type].count++;
            ftDist[type].totalSize += m.fileSize || 0;
        });
        const fileTypeBreakdown = Object.values(ftDist).sort((a, b) => b.count - a.count);

        // ── 7. Streaks ─────────────────────────────────────────────
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        for (const day of heatmap) {
            if (day.count > 0) {
                tempStreak++;
                if (tempStreak > longestStreak) longestStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        }
        // Current streak (counting backwards from today)
        for (let i = heatmap.length - 1; i >= 0; i--) {
            if (heatmap[i].count > 0) currentStreak++;
            else if (i === heatmap.length - 1) continue; // Allow missing today? Or no.
            else break;
        }

        const growthRate = 0; // Simplified

        res.json({
            success: true,
            data: {
                overview: {
                    ...overview,
                    verificationRate: overview.totalMemories > 0 ? Math.round((overview.onChainCount / overview.totalMemories) * 100) : 0,
                    encryptionRate: overview.totalMemories > 0 ? Math.round((overview.encryptedCount / overview.totalMemories) * 100) : 0,
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

