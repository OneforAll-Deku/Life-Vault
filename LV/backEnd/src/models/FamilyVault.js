import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class FamilyVault {
    constructor(data) {
        Object.assign(this, data);
        this._id = data._id || data.id || `fv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.id = this._id;
        this.ownerId = data.ownerId || data.owner_id;
        this.name = data.name;
        this.description = data.description || '';
        this.members = data.members || [];
        this.settings = data.settings || {};
        this.createdAt = data.createdAt || data.created_at || new Date();
        this.updatedAt = data.updatedAt || data.updated_at || new Date();
    }

    static find(query = {}) {
        const dbQuery = {};
        if (query.ownerId) dbQuery.owner_id = query.ownerId;
        if (query.id) dbQuery.id = query.id;
        if (query._id) dbQuery.id = query._id;

        const promise = supabaseService.find('family_vaults', dbQuery).then(data => data.map(fv => new FamilyVault(fv)));
        return new Query(promise, query);
    }

    static async findOne(query) {
        const items = await this.find(query);
        return items.length > 0 ? items[0] : null;
    }

    static async findById(id) {
        const data = await supabaseService.getRecord(id, 'family_vaults');
        return data ? new FamilyVault(data) : null;
    }

    toObject() { return { ...this }; }
    populate() { return this; }
    sort() { return this; }
    limit() { return this; }
    skip() { return this; }
    select() { return this; }

    async save() {
        this.updatedAt = new Date();
        const dataToSave = {
            id: this.id || this._id,
            owner_id: this.ownerId,
            name: this.name,
            description: this.description,
            members: this.members,
            settings: this.settings,
            emoji: this.emoji,
            category: this.category,
            color: this.color,
            created_by: this.createdBy,
            is_archived: this.isArchived,
            memories: this.memories,
            invites: this.invites,
            stats: this.stats,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };

        await supabaseService.upsert(dataToSave.id, dataToSave, 'family_vaults');
        return this;
    }

    static async create(data) {
        const fv = new FamilyVault(data);
        await fv.save();
        return fv;
    }

    static async findOneAndUpdate(query, update, options = {}) {
        const item = await this.findOne(query);
        if (item) {
            applyUpdate(item, update);
            await item.save();
            return item;
        }
        return null;
    }

    static async updateMany(query, update) {
        const items = await this.find(query);
        let modifiedCount = 0;
        for (const item of items) {
            applyUpdate(item, update);
            await item.save();
            modifiedCount++;
        }
        return { modifiedCount };
    }

    static async findByIdAndUpdate(id, update) {
        return this.findOneAndUpdate({ id: id }, update);
    }

    static async deleteOne(query) {
        const item = await this.findOne(query);
        if (item) {
            await supabaseService.deleteRecord(item.id || item._id, 'family_vaults');
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    }

    async deleteOne() {
        return FamilyVault.deleteOne({ id: this.id || this._id });
    }

    static async countDocuments(query = {}) {
        const items = await this.find(query);
        return items.length;
    }

    isMember(userId) {
        return (this.members || []).some(m => (m.userId || m.user_id)?.toString() === userId.toString());
    }

    getMemberRole(userId) {
        const member = (this.members || []).find(m => (m.userId || m.user_id)?.toString() === userId.toString());
        return member ? member.role : null;
    }

    canPerform(userId, action) {
        const role = this.getMemberRole(userId);
        if (!role) return false;
        if (role === 'admin') return true;

        const permissions = {
            'contributor': ['upload', 'view', 'invite'],
            'viewer': ['view']
        };

        return (permissions[role] || []).includes(action) || action === 'view';
    }

    static generateInviteCode() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
}

export default FamilyVault;
