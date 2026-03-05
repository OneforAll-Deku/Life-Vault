import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'familyvaults.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class FamilyVault {
    constructor(data) {
        this._id = data._id || `vault_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.name = data.name;
        this.description = data.description || '';
        this.coverImage = data.coverImage || null;
        this.emoji = data.emoji || '👪';
        this.category = data.category || 'family';
        this.color = data.color || '#6366f1';
        this.createdBy = data.createdBy;
        this.members = data.members || [];
        this.memories = data.memories || [];
        this.invites = data.invites || [];
        this.stats = data.stats || {
            totalMemories: 0,
            totalMembers: 0,
            totalSize: 0,
        };
        this.isArchived = data.isArchived || false;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    static async find(query = {}) {
        const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        return items.filter(item => {
            for (let key in query) {
                if (query[key] !== undefined && item[key] !== query[key]) return false;
            }
            return true;
        }).map(item => new FamilyVault(item));
    }

    static async findById(id) {
        const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const item = items.find(i => i._id === id);
        return item ? new FamilyVault(item) : null;
    }

    async save() {
        const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        this.stats.totalMembers = this.members.length;
        this.stats.totalMemories = this.memories.length;

        this.updatedAt = new Date();
        const index = items.findIndex(i => i._id === this._id);
        if (index !== -1) {
            items[index] = { ...this };
        } else {
            items.push(this);
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
        return this;
    }

    static async create(data) {
        const vault = new FamilyVault(data);
        await vault.save();
        return vault;
    }

    static generateInviteCode() {
        return crypto.randomBytes(6).toString('hex');
    }

    isMember(userId) {
        return this.members.some(m => m.userId.toString() === userId.toString());
    }

    getMemberRole(userId) {
        const member = this.members.find(m => m.userId.toString() === userId.toString());
        return member ? member.role : null;
    }

    canPerform(userId, action) {
        const role = this.getMemberRole(userId);
        if (!role) return false;
        const permissions = {
            admin: ['view', 'upload', 'delete', 'invite', 'manage_members', 'edit_vault', 'archive'],
            contributor: ['view', 'upload', 'invite'],
            viewer: ['view'],
        };
        return permissions[role]?.includes(action) || false;
    }
}

export default FamilyVault;
