import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pineconeService from '../services/pineconeService.js';


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
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let filteredItems = items.filter(item => {
      // Handle $or queries
      if (query.$or && Array.isArray(query.$or)) {
        return query.$or.some(condition => {
          for (let key in condition) {
            // Support nested properties like 'recipients.userId'
            if (key.includes('.')) {
              const [parent, child] = key.split('.');
              if (Array.isArray(item[parent])) {
                return item[parent].some(subItem => subItem[child] === condition[key]);
              }
              if (item[parent] && item[parent][child] === condition[key]) return true;
              return false;
            }
            if (item[key] === condition[key]) return true;
          }
          return false;
        });
      }

      // Handle standard queries
      for (let key in query) {
        if (key === '$or') continue;
        if (query[key] !== undefined && item[key] !== query[key]) return false;
      }
      return true;
    });

    // Fallback if no items found and we have a creatorId (common in Render environment)
    if (filteredItems.length === 0 && query.creatorId) {
      console.log(`🔍 Stories for ${query.creatorId} not in local JSON. checking Pinecone...`);
      const pineconeItems = await pineconeService.listRecords(query.creatorId, 'stories');
      if (pineconeItems.length > 0) {
        // Rehydrate locally
        for (const item of pineconeItems) {
          const story = new Story(item);
          await story.save({ skipPinecone: true });
        }
        return pineconeItems.map(item => new Story(item));
      }
    }

    return filteredItems.map(item => new Story(item));
  }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let item = items.find(i => i._id === id);

    if (!item) {
      console.log(`🔍 Story ${id} not in local JSON. Checking Pinecone...`);
      const pineconeRecord = await pineconeService.getRecord(id, 'stories');
      if (pineconeRecord) {
        item = pineconeRecord;
        const story = new Story(item);
        await story.save({ skipPinecone: true });
        return story;
      }
    }

    return item ? new Story(item) : null;
  }

  async save(options = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    this.totalChapters = this.chapters.length;
    this.updatedAt = new Date();
    const index = items.findIndex(i => i._id === this._id);
    if (index !== -1) {
      items[index] = { ...this };
    } else {
      items.push(this);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

    // Sync to Pinecone
    if (!options.skipPinecone) {
      await pineconeService.upsertStory(this);
    }

    return this;
  }

  static async create(data) {
    const story = new Story(data);
    await story.save();
    return story;
  }
}

export default Story;