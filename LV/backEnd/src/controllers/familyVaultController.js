import FamilyVault from '../models/FamilyVault.js';
import Memory from '../models/Memory.js';
import User from '../models/User.js';

// ─── Create Vault ──────────────────────────────────────────────
export const createVault = async (req, res, next) => {
    try {
        const { name, description, emoji, category, color } = req.body;
        const userId = req.user._id;

        const vault = await FamilyVault.create({
            name,
            description,
            emoji: emoji || '👪',
            category: category || 'family',
            color: color || '#6366f1',
            createdBy: userId,
            members: [
                {
                    userId,
                    role: 'admin',
                    joinedAt: new Date(),
                },
            ],
        });

        // Populate creator info manual
        const vaultObj = JSON.parse(JSON.stringify(vault));
        if (vaultObj.members) {
            vaultObj.members = await Promise.all(vaultObj.members.map(async (m) => {
                if (m.userId) {
                    const u = await User.findById(m.userId);
                    if (u) m.userId = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                }
                return m;
            }));
        }

        res.status(201).json({
            success: true,
            data: vaultObj,
        });
    } catch (error) {
        next(error);
    }
};

// ─── Get My Vaults ─────────────────────────────────────────────
export const getMyVaults = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const allVaults = await FamilyVault.find({
            'members.userId': userId,
            isArchived: false,
        });

        // Manual Sort
        const vaultsData = allVaults.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        // Manual Population
        const vaults = await Promise.all(vaultsData.map(async (v) => {
            const vObj = JSON.parse(JSON.stringify(v));
            if (vObj.members) {
                vObj.members = await Promise.all(vObj.members.map(async (m) => {
                    if (m.userId) {
                        const u = await User.findById(m.userId);
                        if (u) m.userId = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                    }
                    return m;
                }));
            }
            if (vObj.createdBy) {
                const creator = await User.findById(vObj.createdBy);
                if (creator) vObj.createdBy = { _id: creator._id, name: creator.name, email: creator.email, avatar: creator.avatar };
            }
            return vObj;
        }));

        res.json({
            success: true,
            data: vaults,
        });
    } catch (error) {
        next(error);
    }
};

// ─── Get Vault by ID ───────────────────────────────────────────
export const getVault = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }

        const vObj = JSON.parse(JSON.stringify(vault));

        // Manual Population
        if (vObj.members) {
            vObj.members = await Promise.all(vObj.members.map(async (m) => {
                if (m.userId) {
                    const u = await User.findById(m.userId);
                    if (u) m.userId = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                }
                return m;
            }));
        }
        if (vObj.createdBy) {
            const creator = await User.findById(vObj.createdBy);
            if (creator) vObj.createdBy = { _id: creator._id, name: creator.name, email: creator.email, avatar: creator.avatar };
        }
        if (vObj.memories) {
            vObj.memories = await Promise.all(vObj.memories.map(async (mem) => {
                if (mem.memoryId) {
                    const m = await Memory.findById(mem.memoryId);
                    if (m) mem.memoryId = { _id: m._id, title: m.title, description: m.description, category: m.category, ipfsHash: m.ipfsHash, fileType: m.fileType, fileSize: m.fileSize, isOnChain: m.isOnChain, createdAt: m.createdAt };
                }
                if (mem.addedBy) {
                    const u = await User.findById(mem.addedBy);
                    if (u) mem.addedBy = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                }
                return mem;
            }));
        }

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }

        // Check membership
        if (!vault.isMember(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: vault });
    } catch (error) {
        next(error);
    }
};

// ─── Update Vault ──────────────────────────────────────────────
export const updateVault = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }
        if (!vault.canPerform(req.user._id, 'edit_vault')) {
            return res.status(403).json({ success: false, message: 'Only admins can edit' });
        }

        const { name, description, emoji, category, color } = req.body;
        if (name) vault.name = name;
        if (description !== undefined) vault.description = description;
        if (emoji) vault.emoji = emoji;
        if (category) vault.category = category;
        if (color) vault.color = color;

        await vault.save();

        const vObj = JSON.parse(JSON.stringify(vault));
        if (vObj.members) {
            vObj.members = await Promise.all(vObj.members.map(async (m) => {
                if (m.userId) {
                    const u = await User.findById(m.userId);
                    if (u) m.userId = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                }
                return m;
            }));
        }

        res.json({ success: true, data: vObj });
    } catch (error) {
        next(error);
    }
};

// ─── Delete / Archive Vault ────────────────────────────────────
export const deleteVault = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }
        if (vault.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the creator can delete' });
        }

        vault.isArchived = true;
        await vault.save();

        res.json({ success: true, message: 'Vault archived' });
    } catch (error) {
        next(error);
    }
};

// ─── Add Memory to Vault ───────────────────────────────────────
export const addMemory = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }
        if (!vault.canPerform(req.user._id, 'upload')) {
            return res
                .status(403)
                .json({ success: false, message: 'You cannot upload to this vault' });
        }

        const { memoryId, caption } = req.body;

        // Verify the memory exists and belongs to the user
        const memory = await Memory.findOne({
            _id: memoryId,
            userId: req.user._id,
        });

        if (!memory) {
            return res
                .status(404)
                .json({ success: false, message: 'Memory not found or not yours' });
        }

        // Don't add duplicates
        const exists = vault.memories.some(
            (m) => m.memoryId.toString() === memoryId.toString()
        );
        if (exists) {
            return res
                .status(400)
                .json({ success: false, message: 'Memory already in vault' });
        }

        vault.memories.push({
            memoryId,
            addedBy: req.user._id,
            caption,
        });

        vault.stats.totalSize += memory.fileSize || 0;
        await vault.save();

        // Re-populate for response manual
        const vObj = JSON.parse(JSON.stringify(vault));
        if (vObj.memories) {
            vObj.memories = await Promise.all(vObj.memories.map(async (mem) => {
                if (mem.memoryId) {
                    const m = await Memory.findById(mem.memoryId);
                    if (m) mem.memoryId = { _id: m._id, title: m.title, description: m.description, category: m.category, ipfsHash: m.ipfsHash, fileType: m.fileType, fileSize: m.fileSize, isOnChain: m.isOnChain, createdAt: m.createdAt };
                }
                if (mem.addedBy) {
                    const u = await User.findById(mem.addedBy);
                    if (u) mem.addedBy = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                }
                return mem;
            }));
        }

        res.json({ success: true, data: vObj });
    } catch (error) {
        next(error);
    }
};

// ─── Remove Memory from Vault ──────────────────────────────────
export const removeMemory = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }

        const memoryEntry = vault.memories.find(
            (m) => m.memoryId.toString() === req.params.memoryId
        );

        if (!memoryEntry) {
            return res
                .status(404)
                .json({ success: false, message: 'Memory not in vault' });
        }

        // Admin can delete any, others can only delete their own
        const isAdmin = vault.getMemberRole(req.user._id) === 'admin';
        const isOwner =
            memoryEntry.addedBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Cannot remove this memory',
            });
        }

        vault.memories = vault.memories.filter(
            (m) => m.memoryId.toString() !== req.params.memoryId
        );
        await vault.save();

        res.json({ success: true, message: 'Memory removed from vault' });
    } catch (error) {
        next(error);
    }
};

// ─── Generate Invite Link ──────────────────────────────────────
export const createInvite = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }
        if (!vault.canPerform(req.user._id, 'invite')) {
            return res.status(403).json({ success: false, message: 'Cannot create invites' });
        }

        const { role, maxUses, expiresInDays } = req.body;

        const code = FamilyVault.generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

        vault.invites.push({
            code,
            role: role || 'contributor',
            createdBy: req.user._id,
            maxUses: maxUses || 10,
            expiresAt,
        });

        await vault.save();

        res.json({
            success: true,
            data: {
                code,
                inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/vault/join/${code}`,
                expiresAt,
                role: role || 'contributor',
                maxUses: maxUses || 10,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── Join via Invite ───────────────────────────────────────────
export const joinVault = async (req, res, next) => {
    try {
        const { code } = req.params;

        const vault = await FamilyVault.findOne({
            'invites.code': code,
            'invites.isActive': true,
        });

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Invalid invite link' });
        }

        const invite = vault.invites.find(
            (i) => i.code === code && i.isActive
        );

        if (!invite) {
            return res.status(404).json({ success: false, message: 'Invalid invite link' });
        }

        // Check expiry
        if (new Date() > invite.expiresAt) {
            invite.isActive = false;
            await vault.save();
            return res.status(410).json({ success: false, message: 'Invite has expired' });
        }

        // Check max uses
        if (invite.usedCount >= invite.maxUses) {
            invite.isActive = false;
            await vault.save();
            return res
                .status(410)
                .json({ success: false, message: 'Invite has reached max uses' });
        }

        // Already a member?
        if (vault.isMember(req.user._id)) {
            return res
                .status(400)
                .json({ success: false, message: 'Already a member of this vault' });
        }

        vault.members.push({
            userId: req.user._id,
            role: invite.role,
            invitedBy: invite.createdBy,
        });

        invite.usedCount += 1;
        if (invite.usedCount >= invite.maxUses) {
            invite.isActive = false;
        }

        await vault.save();

        const vObj = JSON.parse(JSON.stringify(vault));
        if (vObj.members) {
            vObj.members = await Promise.all(vObj.members.map(async (m) => {
                if (m.userId) {
                    const u = await User.findById(m.userId);
                    if (u) m.userId = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                }
                return m;
            }));
        }

        res.json({
            success: true,
            message: `Joined "${vault.name}" as ${invite.role}`,
            data: vObj,
        });
    } catch (error) {
        next(error);
    }
};

// ─── Get Invite Info (public, no auth) ─────────────────────────
export const getInviteInfo = async (req, res, next) => {
    try {
        const { code } = req.params;

        const vault = await FamilyVault.findOne({
            'invites.code': code,
            'invites.isActive': true,
        });

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Invalid invite link' });
        }

        const creator = await User.findById(vault.createdBy);
        const creatorData = creator ? { _id: creator._id, name: creator.name, avatar: creator.avatar } : vault.createdBy;

        const invite = vault.invites.find(
            (i) => i.code === code && i.isActive
        );

        if (!invite || new Date() > invite.expiresAt) {
            return res.status(410).json({ success: false, message: 'Invite has expired' });
        }

        res.json({
            success: true,
            data: {
                vaultName: vault.name,
                emoji: vault.emoji,
                description: vault.description,
                category: vault.category,
                color: vault.color,
                memberCount: vault.members.length,
                memoryCount: vault.memories.length,
                createdBy: creatorData,
                role: invite.role,
                expiresAt: invite.expiresAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── Update Member Role ────────────────────────────────────────
export const updateMemberRole = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }
        if (!vault.canPerform(req.user._id, 'manage_members')) {
            return res.status(403).json({ success: false, message: 'Only admins can manage members' });
        }

        const { memberId, role } = req.body;

        // Can't change your own role
        if (memberId === req.user._id.toString()) {
            return res
                .status(400)
                .json({ success: false, message: 'Cannot change your own role' });
        }

        const member = vault.members.find(
            (m) => m.userId.toString() === memberId
        );

        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        member.role = role;
        await vault.save();

        const vObj = JSON.parse(JSON.stringify(vault));
        if (vObj.members) {
            vObj.members = await Promise.all(vObj.members.map(async (m) => {
                if (m.userId) {
                    const u = await User.findById(m.userId);
                    if (u) m.userId = { _id: u._id, name: u.name, email: u.email, avatar: u.avatar };
                }
                return m;
            }));
        }

        res.json({ success: true, data: vObj });
    } catch (error) {
        next(error);
    }
};

// ─── Remove Member ─────────────────────────────────────────────
export const removeMember = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }

        const targetId = req.params.memberId;
        const isAdmin = vault.canPerform(req.user._id, 'manage_members');
        const isSelf = req.user._id.toString() === targetId;

        if (!isAdmin && !isSelf) {
            return res
                .status(403)
                .json({ success: false, message: 'Cannot remove this member' });
        }

        // Creator cannot leave
        if (vault.createdBy.toString() === targetId) {
            return res
                .status(400)
                .json({ success: false, message: 'Creator cannot be removed' });
        }

        vault.members = vault.members.filter(
            (m) => m.userId.toString() !== targetId
        );
        await vault.save();

        res.json({ success: true, message: 'Member removed' });
    } catch (error) {
        next(error);
    }
};

// ─── Get Vault Activity Feed ───────────────────────────────────
export const getActivity = async (req, res, next) => {
    try {
        const vault = await FamilyVault.findById(req.params.id);

        if (!vault) {
            return res.status(404).json({ success: false, message: 'Vault not found' });
        }
        if (!vault.isMember(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Build activity from memories manual population
        const activity = await Promise.all(vault.memories
            .filter((m) => m.memoryId)
            .map(async (m) => {
                const addedBy = await User.findById(m.addedBy);
                const memory = await Memory.findById(m.memoryId);

                return {
                    type: 'memory_added',
                    user: addedBy ? { _id: addedBy._id, name: addedBy.name, avatar: addedBy.avatar } : m.addedBy,
                    memory: memory ? { _id: memory._id, title: memory.title, category: memory.category, fileType: memory.fileType, createdAt: memory.createdAt } : m.memoryId,
                    caption: m.caption,
                    timestamp: m.addedAt,
                };
            }));

        activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedActivity = activity.slice(0, 50);

        res.json({ success: true, data: limitedActivity });
    } catch (error) {
        next(error);
    }
};
