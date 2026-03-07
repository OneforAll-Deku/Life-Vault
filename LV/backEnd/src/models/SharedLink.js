import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class SharedLink {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `sl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.memoryId = data.memoryId || data.memory_id;
    this.creatorId = data.creatorId || data.creator_id;
    this.accessToken = data.accessToken || data.access_token;
    this.expiresAt = data.expiresAt || data.expires_at || null;
    this.maxUses = data.maxUses || data.max_uses || null;
    this.useCount = data.useCount || data.use_count || 0;
    this.isActive = data.isActive ?? data.is_active ?? true;
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.memoryId) dbQuery.memory_id = query.memoryId;
    if (query.creatorId) dbQuery.creator_id = query.creatorId;
    if (query.accessToken) dbQuery.access_token = query.accessToken;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('shared_links', dbQuery).then(data => data.map(sl => new SharedLink(sl)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  async save() {
    this.updatedAt = new Date();
    const dataToSave = {
      id: this.id || this._id,
      memory_id: this.memoryId,
      creator_id: this.creatorId,
      access_token: this.accessToken,
      expires_at: this.expiresAt,
      max_uses: this.maxUses,
      use_count: this.useCount,
      is_active: this.isActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'shared_links');
    return this;
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

  static async create(data) {
    const sl = new SharedLink(data);
    await sl.save();
    return sl;
  }

  static async deleteOne(query) {
    const item = await this.findOne(query);
    if (item) {
      await supabaseService.deleteRecord(item.id || item._id, 'shared_links');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteOne() {
    return SharedLink.deleteOne({ id: this.id || this._id });
  }

  static async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }
}

export default SharedLink;