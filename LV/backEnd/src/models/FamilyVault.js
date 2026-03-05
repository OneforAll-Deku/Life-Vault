import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { matchesQuery } from '../utils/queryHelper.js';

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
        Object.assign(this, data);
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
        try {
            if (!fs.existsSync(DATA_FILE)) return [];
            const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            return items.filter(item => matchesQuery(item, query)).map(item => new FamilyVault(item));
        } catch (err) {
            console.error('Error reading familyvaults.json:', err.message);
            return [];
        }
    }

    static async findOne(query) {
        const items = await this.find(query);
        return items.length > 0 ? items[0] : null;
    }

    static async findById(id) {
        const items = await this.find({});
        const item = items.find(i => i._id === id);
        return item ? new FamilyVault(item) : null;
    }

    toObject() {
        return { ...this };
    }

    populate() { return this; }
    sort() { return this; }
    limit() { return this; }
    skip() { return this; }
    select() { return this; }

    async save() {
        const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        this.stats.totalMembers = this.members.length;
        this.stats.totalMemories = this.memories.length;

        this.updatedAt = new Date();
        const index = items.findIndex(i => i._id === this._id);
        if (index !== -1) {
            items[index] = { ...this };
        } else {
            items.push({ ...this });
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
        return this.members.some(m => m.userId?.toString() === userId?.toString());
    }

    getMemberRole(userId) {
        const member = this.members.find(m => m.userId?.toString() === userId?.toString());
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

    static async findOneAndUpdate(query, update, options = {}) {
        const item = await this.findOne(query);
        if (item) {
            const dataToSet = update.$set || update;
            Object.assign(item, dataToSet);
            await item.save();
            return item;
        }
        return null;
    }

    static async findByIdAndUpdate(id, update) {
        return this.findOneAndUpdate({ _id: id }, update);
    }

    static async deleteOne(query) {
        const item = await this.findOne(query);
        if (item) {
            const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            const filtered = items.filter(i => i._id !== item._id);
            fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    }

    static async deleteMany(query) {
        const items = await this.find(query);
        let deletedCount = 0;
        for (const item of items) {
            await this.deleteOne({ _id: item._id });
            deletedCount++;
        }
        return { deletedCount };
    }

    static async findOneAndDelete(query) {
        const item = await this.findOne(query);
        if (item) {
            await this.deleteOne({ _id: item._id });
            return item;
        }
        return null;
    }

    static async updateMany(query, update) {
        const items = await this.find(query);
        let modifiedCount = 0;
        const dataToSet = update.$set || update;

        for (const item of items) {
            Object.assign(item, dataToSet);
            await item.save();
            modifiedCount++;
        }
        return { modifiedCount };
    }

    static async countDocuments(query = {}) {
        const items = await this.find(query);
        return items.length;
    }

    async deleteOne() {
        return FamilyVault.deleteOne({ _id: this._id });
    }
}

export default FamilyVault;
