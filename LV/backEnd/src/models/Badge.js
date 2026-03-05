import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BADGE_RARITY } from '../config/constants.js';
import { matchesQuery, Query } from '../utils/queryHelper.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'badges.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class Badge {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `badge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.name = data.name;
    this.description = data.description || '';
    this.shortCode = data.shortCode || 'B' + crypto.randomBytes(3).toString('hex').toUpperCase();
    this.creatorId = data.creatorId;
    this.campaignId = data.campaignId || null;
    this.imageUrl = data.imageUrl;
    this.thumbnailUrl = data.thumbnailUrl || null;
    this.animatedUrl = data.animatedUrl || null;
    this.backgroundColor = data.backgroundColor || '#000000';
    this.nftMetadata = data.nftMetadata || { isNft: false, collectionId: null, maxSupply: null, currentSupply: 0, royaltyPercentage: 0, attributes: [] };
    this.rarity = data.rarity || BADGE_RARITY.COMMON;
    this.category = data.category || 'achievement';
    this.tier = data.tier || 1;
    this.requirements = data.requirements || { questId: null, campaignCompletion: false, questCount: 0, specificLocations: [], customCondition: '' };
    this.stats = data.stats || { totalAwarded: 0, uniqueHolders: 0 };
    this.onChainBadgeId = data.onChainBadgeId || null;
    this.contractAddress = data.contractAddress || null;
    this.metadataUri = data.metadataUri || null;
    this.isActive = data.isActive ?? true;
    this.isTransferable = data.isTransferable ?? true;
    this.isBurnable = data.isBurnable || false;
    this.expiresAt = data.expiresAt || null;
    this.pointValue = data.pointValue || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static find(query = {}) {
    try {
      if (!fs.existsSync(DATA_FILE)) return new Query([]);
      const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const results = items.filter(item => matchesQuery(item, query)).map(item => new Badge(item));
      return new Query(results);
    } catch (err) {
      console.error('Error reading badges.json:', err.message);
      return new Query([]);
    }
  }

  static async findOne(query) {
    const q = this.find(query);
    const results = await q;
    return results.length > 0 ? results[0] : null;
  }

  static async findById(id) {
    const q = this.find({ _id: id });
    const results = await q;
    return results.length > 0 ? results[0] : null;
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
    const badge = new Badge(data);
    await badge.save();
    return badge;
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
    const q = this.find(query);
    const items = await q;
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
    const q = this.find(query);
    const items = await q;
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
    const q = this.find(query);
    const items = await q;
    return items.length;
  }

  async deleteOne() {
    return Badge.deleteOne({ _id: this._id });
  }
}

export default Badge;