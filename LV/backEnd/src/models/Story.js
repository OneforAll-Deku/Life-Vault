import crypto from 'crypto';
import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class Story {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `story_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.title = data.title;
    this.description = data.description || '';
    this.shortCode = data.shortCode || data.short_code || 'S' + crypto.randomBytes(4).toString('hex').toUpperCase();
    this.creatorId = data.creatorId || data.creator_id;
    this.recipients = data.recipients || [];
    this.isCollaborative = data.isCollaborative || data.is_collaborative || false;
    this.coAuthors = data.coAuthors || data.co_authors || [];
    this.isInteractive = data.isInteractive || data.is_interactive || false;
    this.isPublic = data.isPublic || data.is_public || false;
    this.chapters = data.chapters || [];
    this.totalChapters = data.totalChapters || data.total_chapters || 0;
    this.settings = data.settings || { theme: 'memory' };
    this.coverImage = data.coverImage || data.cover_image || null;
    this.backgroundMusic = data.backgroundMusic || data.background_music || null;
    this.isEncrypted = data.isEncrypted ?? data.is_encrypted ?? true;
    this.status = data.status || 'draft';
    this.activatedAt = data.activatedAt || data.activated_at || null;
    this.completedAt = data.completedAt || data.completed_at || null;
    this.stats = data.stats || { totalViews: 0, completions: 0 };
    this.linkedCampaignId = data.linkedCampaignId || data.linked_campaign_id || null;
    this.tags = data.tags || [];
    this.occasion = data.occasion || 'other';
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.creatorId) dbQuery.creator_id = query.creatorId;
    if (query.shortCode) dbQuery.short_code = query.shortCode;
    if (query.status) dbQuery.status = query.status;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('stories', dbQuery).then(data => data.map(s => new Story(s)));
    return new Query(promise, query);
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'stories');
    return data ? new Story(data) : null;
  }

  static async findOne(query = {}) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  toObject() { return { ...this }; }
  populate() { return this; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }
  select() { return this; }

  async save(options = {}) {
    this.totalChapters = this.chapters.length;
    this.updatedAt = new Date();

    const dataToSave = {
      id: this.id || this._id,
      creator_id: this.creatorId,
      title: this.title,
      description: this.description,
      short_code: this.shortCode,
      recipients: this.recipients,
      is_collaborative: this.isCollaborative,
      co_authors: this.coAuthors,
      is_interactive: this.isInteractive,
      is_public: this.isPublic,
      chapters: this.chapters,
      total_chapters: this.totalChapters,
      settings: this.settings,
      cover_image: this.coverImage,
      background_music: this.backgroundMusic,
      is_encrypted: this.isEncrypted,
      status: this.status,
      activated_at: this.activatedAt,
      completed_at: this.completedAt,
      stats: this.stats,
      linked_campaign_id: this.linkedCampaignId,
      tags: this.tags,
      occasion: this.occasion,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'stories');
    return this;
  }

  static async create(data) {
    const story = new Story(data);
    await story.save();
    return story;
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

  static async findByIdAndUpdate(id, update) {
    return this.findOneAndUpdate({ id: id }, update);
  }

  static async deleteOne(query) {
    const item = await this.findOne(query);
    if (item) {
      await supabaseService.deleteRecord(item.id || item._id, 'stories');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  static async deleteMany(query) {
    const items = await this.find(query);
    let deletedCount = 0;
    for (const item of items) {
      await this.deleteOne({ id: item.id || item._id });
      deletedCount++;
    }
    return { deletedCount };
  }

  static async findOneAndDelete(query) {
    const item = await this.findOne(query);
    if (item) {
      await this.deleteOne({ id: item.id || item._id });
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

  static async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }

  async deleteOne() {
    return Story.deleteOne({ id: this.id || this._id });
  }
}

export default Story;