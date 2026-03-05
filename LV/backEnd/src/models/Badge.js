import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BADGE_RARITY } from '../config/constants.js';

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

  static async find(query = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return items.filter(item => {
      for (let key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) return false;
      }
      return true;
    }).map(item => new Badge(item));
  }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const item = items.find(i => i._id === id);
    return item ? new Badge(item) : null;
  }

  async save() {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
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
    const badge = new Badge(data);
    await badge.save();
    return badge;
  }
}

export default Badge;