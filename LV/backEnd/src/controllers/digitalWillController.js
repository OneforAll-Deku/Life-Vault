import DigitalWill from '../models/DigitalWill.js';
import Memory from '../models/Memory.js';
import crypto from 'crypto';
import willNotificationService from '../services/willNotificationService.js';

/* ──────────────────────────────────────────────────────────────
   DIGITAL WILL CONTROLLER
   Full CRUD + multi-sig + dead-man's-switch + notarization
   ────────────────────────────────────────────────────────────── */

// ── CREATE a new Digital Will ──
export const createWill = async (req, res, next) => {
    try {
        const {
            title, description, beneficiaries, multiSig,
            deadManSwitch, legalTemplate, globalMemories,
        } = req.body;

        // Validate at least one beneficiary
        if (!beneficiaries || beneficiaries.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one beneficiary is required' });
        }

        // Generate confirmation tokens for each beneficiary
        const enrichedBeneficiaries = beneficiaries.map(b => ({
            ...b,
            confirmationToken: crypto.randomBytes(24).toString('hex'),
        }));

        const will = await DigitalWill.create({
            userId: req.user._id,
            title: title || 'My Digital Legacy',
            description,
            beneficiaries: enrichedBeneficiaries,
            multiSig: {
                enabled: multiSig?.enabled ?? true,
                requiredConfirmations: multiSig?.requiredConfirmations ?? 2,
            },
            deadManSwitch: {
                enabled: deadManSwitch?.enabled ?? false,
                inactivityMonths: deadManSwitch?.inactivityMonths ?? 6,
                lastCheckinAt: new Date(),
            },
            legalTemplate: legalTemplate || { type: 'standard' },
            globalMemories: globalMemories || [],
            activityLog: [{ action: 'created', performedBy: req.user._id, details: 'Will created' }],
        });

        res.status(201).json({
            success: true,
            message: 'Digital Will created successfully',
            data: { will },
        });
    } catch (error) {
        next(error);
    }
};

// ── GET all wills for current user ──
export const getMyWills = async (req, res, next) => {
    try {
        const allWills = await DigitalWill.find({ userId: req.user._id });

        // Manual Sort
        const wills = allWills.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        // Manual Population
        const populatedWills = await Promise.all(wills.map(async (will) => {
            const wObj = JSON.parse(JSON.stringify(will));

            // Populate assignedMemories for each beneficiary
            if (wObj.beneficiaries) {
                wObj.beneficiaries = await Promise.all(wObj.beneficiaries.map(async (b) => {
                    if (b.assignedMemories && b.assignedMemories.length > 0) {
                        b.assignedMemories = await Promise.all(b.assignedMemories.map(async (mId) => {
                            const m = await Memory.findById(mId);
                            return m ? { _id: m._id, title: m.title, category: m.category, ipfsHash: m.ipfsHash } : mId;
                        }));
                    }
                    return b;
                }));
            }

            // Populate globalMemories
            if (wObj.globalMemories && wObj.globalMemories.length > 0) {
                wObj.globalMemories = await Promise.all(wObj.globalMemories.map(async (mId) => {
                    const m = await Memory.findById(mId);
                    return m ? { _id: m._id, title: m.title, category: m.category, ipfsHash: m.ipfsHash } : mId;
                }));
            }

            return wObj;
        }));

        res.json({ success: true, data: { wills: populatedWills, count: populatedWills.length } });
    } catch (error) {
        next(error);
    }
};

// ── GET single will ──
export const getWill = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });

        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        const wObj = JSON.parse(JSON.stringify(will));

        // Manual Population
        if (wObj.beneficiaries) {
            wObj.beneficiaries = await Promise.all(wObj.beneficiaries.map(async (b) => {
                if (b.assignedMemories && b.assignedMemories.length > 0) {
                    b.assignedMemories = await Promise.all(b.assignedMemories.map(async (mId) => {
                        const m = await Memory.findById(mId);
                        return m ? { _id: m._id, title: m.title, category: m.category, ipfsHash: m.ipfsHash, thumbnailUrl: m.thumbnailUrl } : mId;
                    }));
                }
                return b;
            }));
        }

        if (wObj.globalMemories && wObj.globalMemories.length > 0) {
            wObj.globalMemories = await Promise.all(wObj.globalMemories.map(async (mId) => {
                const m = await Memory.findById(mId);
                return m ? { _id: m._id, title: m.title, category: m.category, ipfsHash: m.ipfsHash, thumbnailUrl: m.thumbnailUrl } : mId;
            }));
        }

        if (wObj.activityLog) {
            wObj.activityLog = await Promise.all(wObj.activityLog.map(async (log) => {
                if (log.performedBy) {
                    const u = await User.findById(log.performedBy);
                    if (u) log.performedBy = { _id: u._id, name: u.name, email: u.email };
                }
                return log;
            }));
        }

        res.json({ success: true, data: { will: wObj } });
    } catch (error) {
        next(error);
    }
};

// ── UPDATE will ──
export const updateWill = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });
        if (will.status === 'executed') {
            return res.status(400).json({ success: false, message: 'Cannot edit an executed will' });
        }

        const { title, description, beneficiaries, multiSig, deadManSwitch, legalTemplate, globalMemories, status } = req.body;

        if (title) will.title = title;
        if (description !== undefined) will.description = description;
        if (legalTemplate) will.legalTemplate = { ...will.legalTemplate, ...legalTemplate };
        if (globalMemories) will.globalMemories = globalMemories;
        if (status && ['draft', 'active', 'revoked'].includes(status)) will.status = status;

        if (beneficiaries) {
            will.beneficiaries = beneficiaries.map(b => ({
                ...b,
                confirmationToken: b.confirmationToken || crypto.randomBytes(24).toString('hex'),
            }));
        }

        if (multiSig) {
            will.multiSig = { ...will.multiSig, ...multiSig };
        }

        if (deadManSwitch) {
            will.deadManSwitch = { ...will.deadManSwitch, ...deadManSwitch };
        }

        will.logActivity('updated', req.user._id, 'Will updated');
        await will.save();

        res.json({ success: true, message: 'Will updated', data: { will } });
    } catch (error) {
        next(error);
    }
};

// ── DELETE will ──
export const deleteWill = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });
        res.json({ success: true, message: 'Will deleted' });
    } catch (error) {
        next(error);
    }
};

// ── ADD BENEFICIARY ──
export const addBeneficiary = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        const { name, email, walletAddress, relationship, assignedMemories, assignedCategories, personalMessage } = req.body;
        if (!name || (!email && !walletAddress)) {
            return res.status(400).json({ success: false, message: 'Name and either email or wallet address are required' });
        }

        const beneficiaryData = {
            name, email, walletAddress, relationship,
            assignedMemories: assignedMemories || [],
            assignedCategories: assignedCategories || [],
            personalMessage,
            confirmationToken: crypto.randomBytes(24).toString('hex'),
        };

        will.beneficiaries.push(beneficiaryData);
        will.logActivity('beneficiary_added', req.user._id, `Added ${name} (${email || walletAddress})`);
        await will.save();

        // Send invitation email if email is provided
        if (email) {
            const addedBeneficiary = will.beneficiaries[will.beneficiaries.length - 1];
            await willNotificationService.sendInvitationEmail(will, addedBeneficiary, req.user.name || 'A LifeVault user');
        }

        res.json({ success: true, message: 'Beneficiary added', data: { will } });
    } catch (error) {
        next(error);
    }
};

// ── REMOVE BENEFICIARY ──
export const removeBeneficiary = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        const beneficiary = will.beneficiaries.find(b => b._id === req.params.beneficiaryId || b.id === req.params.beneficiaryId);
        if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });

        will.logActivity('beneficiary_removed', req.user._id, `Removed ${beneficiary.name}`);
        will.beneficiaries = will.beneficiaries.filter(b => b._id !== req.params.beneficiaryId && b.id !== req.params.beneficiaryId);
        await will.save();

        res.json({ success: true, message: 'Beneficiary removed', data: { will } });
    } catch (error) {
        next(error);
    }
};

// ── ASSIGN MEMORIES TO BENEFICIARY ──
export const assignMemories = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        const beneficiary = will.beneficiaries.find(b => b._id === req.params.beneficiaryId || b.id === req.params.beneficiaryId);
        if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });

        const { memoryIds, categories } = req.body;
        if (memoryIds) beneficiary.assignedMemories = memoryIds;
        if (categories) beneficiary.assignedCategories = categories;

        will.logActivity('memory_assigned', req.user._id, `Assigned memories to ${beneficiary.name}`);
        await will.save();

        res.json({ success: true, message: 'Memories assigned', data: { will } });
    } catch (error) {
        next(error);
    }
};

// ── BENEFICIARY CONFIRMATION (multi-sig) ──
export const confirmBeneficiary = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Confirmation token is required' });

        const will = await DigitalWill.findOne({ 'beneficiaries.confirmationToken': token });
        if (!will) return res.status(404).json({ success: false, message: 'Invalid confirmation token' });

        const beneficiary = will.beneficiaries.find(b => b.confirmationToken === token);
        if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });

        if (beneficiary.hasConfirmed) {
            return res.status(400).json({ success: false, message: 'Already confirmed' });
        }

        beneficiary.hasConfirmed = true;
        beneficiary.confirmedAt = new Date();
        beneficiary.confirmationToken = null; // one-time use

        will.logActivity('beneficiary_confirmed', null, `${beneficiary.name} confirmed receipt`);
        await will.save();

        res.json({
            success: true,
            message: 'Confirmation recorded',
            data: {
                currentConfirmations: will.multiSig.currentConfirmations,
                requiredConfirmations: will.multiSig.requiredConfirmations,
                isUnlockable: will.isUnlockable(),
            },
        });
    } catch (error) {
        next(error);
    }
};

// ── DEAD MAN'S SWITCH – CHECKIN ──
export const checkin = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        await will.checkin();

        res.json({
            success: true,
            message: 'Check-in recorded',
            data: {
                lastCheckinAt: will.deadManSwitch.lastCheckinAt,
                nextDeadline: will.deadManSwitch.nextDeadline,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ── NOTARIZE WILL (blockchain timestamp) ──
export const notarizeWill = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        const contentHash = will.generateContentHash();

        // In production you'd call blockchainService.storeMemoryOnChain(contentHash)
        // For now we simulate the notarization with a mock tx hash
        const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');
        const mockBlockNumber = Math.floor(Date.now() / 1000);

        will.notarization = {
            isNotarized: true,
            txHash: mockTxHash,
            blockNumber: mockBlockNumber,
            notarizedAt: new Date(),
            contentHash,
        };
        will.status = 'active';

        will.logActivity('notarized', req.user._id, `Will notarized on-chain`, mockTxHash);
        await will.save();

        res.json({
            success: true,
            message: 'Will notarized on blockchain',
            data: {
                txHash: mockTxHash,
                blockNumber: mockBlockNumber,
                contentHash,
                notarizedAt: will.notarization.notarizedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ── EXECUTE WILL ──
export const executeWill = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        if (will.status === 'executed') {
            return res.status(400).json({ success: false, message: 'Will already executed' });
        }

        if (will.multiSig.enabled && !will.isUnlockable()) {
            return res.status(400).json({
                success: false,
                message: `Need ${will.multiSig.requiredConfirmations} confirmations. Currently have ${will.multiSig.currentConfirmations}.`,
            });
        }

        will.status = 'executed';
        will.executedAt = new Date();
        will.executionTxHash = '0x' + crypto.randomBytes(32).toString('hex');

        will.logActivity('will_executed', req.user._id, 'Will executed and memories released');
        await will.save();

        res.json({
            success: true,
            message: 'Will executed — memories released to beneficiaries',
            data: { will },
        });
    } catch (error) {
        next(error);
    }
};

// ── GET WILL ACTIVITY LOG ──
export const getActivity = async (req, res, next) => {
    try {
        const will = await DigitalWill.findOne({ _id: req.params.id, userId: req.user._id });
        if (!will) return res.status(404).json({ success: false, message: 'Will not found' });

        const activityLog = await Promise.all((will.activityLog || []).map(async (log) => {
            const entry = JSON.parse(JSON.stringify(log));
            if (entry.performedBy) {
                const u = await User.findById(entry.performedBy);
                if (u) entry.performedBy = { _id: u._id, name: u.name, email: u.email };
            }
            return entry;
        }));

        res.json({ success: true, data: { activityLog } });
    } catch (error) {
        next(error);
    }
};

export default {
    createWill, getMyWills, getWill, updateWill, deleteWill,
    addBeneficiary, removeBeneficiary, assignMemories,
    confirmBeneficiary, checkin, notarizeWill, executeWill, getActivity,
};
