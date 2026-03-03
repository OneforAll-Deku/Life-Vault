import User from '../models/User.js';

/**
 * @desc    Get business statistics
 * @route   GET /api/business/stats
 * @access  Private
 */
export const getBusinessStats = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const stats = {
            totalQuestsCreated: user.businessStats?.totalQuestsCreated || 0,
            totalAptAllocated: user.businessStats?.totalAptAllocated || 0,
            totalAptRewarded: user.businessStats?.totalAptRewarded || 0,
            totalQuestCompletions: user.businessStats?.totalQuestCompletions || 0,
            aptRemaining: (user.businessStats?.totalAptAllocated || 0) - (user.businessStats?.totalAptRewarded || 0),
            lastQuestCreatedAt: user.businessStats?.lastQuestCreatedAt || null,
            organizationInfo: user.organizationInfo || null
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get business stats error:', error);
        next(error);
    }
};
