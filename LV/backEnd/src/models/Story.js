import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pineconeService from '../services/pineconeService.js';
import { matchesQuery } from '../utils/queryHelper.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'stories.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class Story {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `story_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.title = data.title;
    this.description = data.description || '';
    this.shortCode = data.shortCode || 'S' + crypto.randomBytes(4).toString('hex').toUpperCase();
    this.creatorId = data.creatorId;
    this.recipients = data.recipients || [];
    this.isCollaborative = data.isCollaborative || false;
    this.coAuthors = data.coAuthors || [];
    this.isInteractive = data.isInteractive || false;
    this.isPublic = data.isPublic || false;
    this.chapters = data.chapters || [];
    this.totalChapters = data.totalChapters || 0;
    this.settings = data.settings || { theme: 'memory' };
    this.coverImage = data.coverImage || null;
    this.backgroundMusic = data.backgroundMusic || null;
    this.isEncrypted = data.isEncrypted ?? true;
    this.status = data.status || 'draft';
    this.activatedAt = data.activatedAt || null;
    this.completedAt = data.completedAt || null;
    this.stats = data.stats || { totalViews: 0, completions: 0 };
    this.linkedCampaignId = data.linkedCampaignId || null;
    this.tags = data.tags || [];
    this.occasion = data.occasion || 'other';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async find(query = {}) {
    try {
      if (!fs.existsSync(DATA_FILE)) return [];
      const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      let filteredItems = items.filter(item => matchesQuery(item, query));

      // Fallback if no items found and we have a creatorId (common in Render environment)
      if (filteredItems.length === 0 && query.creatorId) {
        console.log(`🔍 Stories for ${query.creatorId} not in local JSON. checking Pinecone...`);
        try {
          const pineconeItems = await pineconeService.listRecords(query.creatorId, 'stories');
          if (pineconeItems.length > 0) {
            for (const item of pineconeItems) {
              const story = new Story(item);
              await story.save({ skipPinecone: true });
            }
            return pineconeItems.map(item => new Story(item));
          }
        } catch (err) {
          console.error('Pinecone fallback failed for stories:', err.message);
        }
      }

      return filteredItems.map(item => new Story(item));
    } catch (err) {
      console.error('Error reading stories.json:', err.message);
      return [];
    }
  }

  static async findById(id) {
    try {
      if (!fs.existsSync(DATA_FILE)) return null;
      const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      let item = items.find(i => i._id === id);

      if (!item) {
        console.log(`🔍 Story ${id} not in local JSON. Checking Pinecone...`);
        try {
          const pineconeRecord = await pineconeService.getRecord(id, 'stories');
          if (pineconeRecord) {
            item = pineconeRecord;
            const story = new Story(item);
            await story.save({ skipPinecone: true });
            return story;
          }
        } catch (err) {
          console.error('Pinecone fallback failed for story:', err.message);
        }
      }

      return item ? new Story(item) : null;
    } catch (err) {
      console.error('Error in Story.findById:', err.message);
      return null;
    }
  }

  static async findOne(query = {}) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  toObject() {
    return { ...this };
  }

  populate() { return this; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }
  select() { return this; }

  async save(options = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    this.totalChapters = this.chapters.length;
    this.updatedAt = new Date();
    const index = items.findIndex(i => i._id === this._id);
    if (index !== -1) {
      items[index] = { ...this };
    } else {
      items.push({ ...this });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

    // Sync to Pinecone
    if (!options.skipPinecone) {
      try {
        await pineconeService.upsertStory(this);
      } catch (err) {
        console.error('Pinecone upsert failed for story:', err.message);
      }
    }

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

      // Also delete from Pinecone
      try {
        await pineconeService.deleteRecord(item._id, 'stories');
      } catch (err) {
        console.error('Pinecone delete failed for story:', err.message);
      }
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
    return Story.deleteOne({ _id: this._id });
  }
}

export default Story;