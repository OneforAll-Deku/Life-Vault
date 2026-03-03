import mongoose from 'mongoose';
import crypto from 'crypto';

const memberSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'contributor', 'viewer'],
        default: 'contributor',
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

const vaultMemorySchema = new mongoose.Schema({
    memoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Memory',
        required: true,
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
    caption: {
        type: String,
        maxlength: 500,
    },
});

const inviteSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ['contributor', 'viewer'],
        default: 'contributor',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    maxUses: {
        type: Number,
        default: 1,
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const familyVaultSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vault name is required'],
            trim: true,
            maxlength: [80, 'Vault name cannot exceed 80 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        coverImage: {
            type: String,
            default: null,
        },
        emoji: {
            type: String,
            default: '👪',
        },
        category: {
            type: String,
            enum: [
                'family',
                'wedding',
                'trip',
                'friends',
                'project',
                'other',
            ],
            default: 'family',
        },
        color: {
            type: String,
            default: '#6366f1', // indigo
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [memberSchema],
        memories: [vaultMemorySchema],
        invites: [inviteSchema],

        // Stats (computed on save / via aggregation)
        stats: {
            totalMemories: { type: Number, default: 0 },
            totalMembers: { type: Number, default: 0 },
            totalSize: { type: Number, default: 0 },
        },

        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
familyVaultSchema.index({ createdBy: 1 });
familyVaultSchema.index({ 'members.userId': 1 });
familyVaultSchema.index({ 'invites.code': 1 });

// Static: generate a unique invite code
familyVaultSchema.statics.generateInviteCode = function () {
    return crypto.randomBytes(6).toString('hex'); // 12-char hex code
};

// Pre-save: update stats
familyVaultSchema.pre('save', function (next) {
    this.stats.totalMembers = this.members.length;
    this.stats.totalMemories = this.memories.length;
    next();
});

// Method: check if a user is a member
familyVaultSchema.methods.isMember = function (userId) {
    return this.members.some(
        (m) => m.userId.toString() === userId.toString()
    );
};

// Method: get member role
familyVaultSchema.methods.getMemberRole = function (userId) {
    const member = this.members.find(
        (m) => m.userId.toString() === userId.toString()
    );
    return member ? member.role : null;
};

// Method: can user perform action
familyVaultSchema.methods.canPerform = function (userId, action) {
    const role = this.getMemberRole(userId);
    if (!role) return false;

    const permissions = {
        admin: [
            'view',
            'upload',
            'delete',
            'invite',
            'manage_members',
            'edit_vault',
            'archive',
        ],
        contributor: ['view', 'upload', 'invite'],
        viewer: ['view'],
    };

    return permissions[role]?.includes(action) || false;
};

export default mongoose.model('FamilyVault', familyVaultSchema);
