import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { QUEST_TYPES, QUEST_STATUS, VERIFICATION_LAYERS, DEFAULTS } from '../config/constants.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'quests.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class Quest {
  constructor(data) {
    this._id = data._id || `quest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.title = data.title;
    this.description = data.description;
    this.shortCode = data.shortCode || crypto.randomBytes(4).toString('hex').toUpperCase();
    this.creatorId = data.creatorId;
    this.creatorType = data.creatorType || 'user';
    this.campaignId = data.campaignId || null;
    this.questType = data.questType;
    this.isPublic = data.isPublic ?? true;
    this.location = data.location || {
      name: '',
      address: '',
      coordinates: { type: 'Point', coordinates: [0, 0] },
      radiusMeters: DEFAULTS.GPS_RADIUS_METERS,
    };
    this.timeWindow = data.timeWindow || { enabled: false };
    this.qrCode = data.qrCode || { enabled: false };
    this.aiVerification = data.aiVerification || { enabled: false };
    this.verificationLayers = data.verificationLayers || [];
    this.rewards = data.rewards || { aptAmount: 0, points: 0 };
    this.budget = data.budget || { totalAptAllocated: 0, aptRemaining: 0, maxCompletions: null, maxCompletionsPerUser: 1 };
    this.status = data.status || QUEST_STATUS.DRAFT;
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    this.stats = data.stats || {
      totalAttempts: 0,
      totalCompletions: 0,
      totalRewardsDistributed: 0,
      averageCompletionTime: 0,
      failureReasons: { locationMismatch: 0, timeWindowClosed: 0, aiRejected: 0, qrInvalid: 0 }
    };
    this.coverImage = data.coverImage || null;
    this.thumbnailImage = data.thumbnailImage || null;
    this.galleryImages = data.galleryImages || [];
    this.onChainQuestId = data.onChainQuestId || null;
    this.contractAddress = data.contractAddress || null;
    this.txHash = data.txHash || null;
    this.tags = data.tags || [];
    this.category = data.category || 'other';
    this.difficulty = data.difficulty || 'easy';
    this.estimatedTime = data.estimatedTime || null;
    this.isFeatured = data.isFeatured || false;
    this.isSponsored = data.isSponsored || false;
    this.requiresApproval = data.requiresApproval || false;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();

    // Sync QR code hash
    if (this.qrCode.enabled && this.qrCode.code && !this.qrCode.codeHash) {
      this.qrCode.codeHash = crypto.createHash('sha256').update(this.qrCode.code).digest('hex');
    }
  }

  static async find(query = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return items.filter(item => {
      for (let key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) return false;
      }
      return true;
    }).map(item => new Quest(item));
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const item = items.find(i => i._id === id);
    return item ? new Quest(item) : null;
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
    const quest = new Quest(data);
    await quest.save();
    return quest;
  }

  get isActive() {
    const now = new Date();
    return this.status === QUEST_STATUS.ACTIVE &&
      (!this.startDate || now >= new Date(this.startDate)) &&
      (!this.endDate || now <= new Date(this.endDate));
  }

  // Mocking nearby search with simple radius check if needed, but for now empty
  static async findNearby(longitude, latitude, maxDistanceMeters = 5000, options = {}) {
    const quests = await this.find({ status: QUEST_STATUS.ACTIVE });
    // Simplified distance check (heuristic)
    return quests.filter(q => {
      if (!q.location.coordinates || !q.location.coordinates.coordinates) return false;
      const [qLong, qLat] = q.location.coordinates.coordinates;
      const dist = Math.sqrt(Math.pow(qLong - longitude, 2) + Math.pow(qLat - latitude, 2));
      // rough conversion: 0.01 degree ~ 1.1km
      return dist < (maxDistanceMeters / 111000);
    }).slice(0, options.limit || 50);
  }
}

export default Quest;