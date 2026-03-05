import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CAMPAIGN_TYPES, QUEST_STATUS } from '../config/constants.js';
import { matchesQuery, Query } from '../utils/queryHelper.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'campaigns.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class Campaign {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `camp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.name = data.name;
    this.description = data.description || '';
    this.shortCode = data.shortCode || 'C' + crypto.randomBytes(4).toString('hex').toUpperCase();
    this.organizationId = data.organizationId;
    this.organizationType = data.organizationType;
    this.organizationName = data.organizationName || '';
    this.organizationLogo = data.organizationLogo || null;
    this.website = data.website || '';
    this.contactEmail = data.contactEmail || '';
    this.campaignType = data.campaignType;
    this.quests = data.quests || [];
    this.completionRequirements = data.completionRequirements || {
      minQuestsRequired: null,
      specificQuestsRequired: [],
      timeLimit: null,
      sequentialCompletion: false,
    };
    this.grandPrize = data.grandPrize || { enabled: false };
    this.budget = data.budget || { totalAptAllocated: 0, aptSpent: 0, aptRemaining: 0, maxParticipants: null };
    this.status = data.status || QUEST_STATUS.DRAFT;
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    this.timezone = data.timezone || 'UTC';
    this.targetRegions = data.targetRegions || [];
    this.stats = data.stats || {
      totalParticipants: 0,
      totalCompletions: 0,
      averageCompletionRate: 0,
      averageCompletionTime: 0,
      questCompletionRates: [],
    };
    this.coverImage = data.coverImage || null;
    this.bannerImage = data.bannerImage || null;
    this.promoVideo = data.promoVideo || null;
    this.gallery = data.gallery || [];
    this.onChainCampaignId = data.onChainCampaignId || null;
    this.escrowAddress = data.escrowAddress || null;
    this.txHash = data.txHash || null;
    this.settings = data.settings || {
      isPublic: true,
      requiresRegistration: false,
      allowLateJoin: true,
      showLeaderboard: true,
      showProgress: true,
    };
    this.tags = data.tags || [];
    this.category = data.category || 'other';
    this.isVerified = data.isVerified || false;
    this.verifiedAt = data.verifiedAt || null;
    this.verifiedBy = data.verifiedBy || null;
    this.isFeatured = data.isFeatured || false;
    this.isSponsored = data.isSponsored || false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static find(query = {}) {
    try {
      if (!fs.existsSync(DATA_FILE)) return new Query([]);
      const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const results = items.filter(item => matchesQuery(item, query)).map(item => new Campaign(item));
      return new Query(results);
    } catch (err) {
      console.error('Error reading campaigns.json:', err.message);
      return new Query([]);
    }
  }

  toObject() {
    return { ...this };
  }

  populate() { return this; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }
  select() { return this; }

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
    const campaign = new Campaign(data);
    await campaign.save();
    return campaign;
  }

  get isActive() {
    const now = new Date();
    return this.status === QUEST_STATUS.ACTIVE &&
      (!this.startDate || now >= new Date(this.startDate)) &&
      (!this.endDate || now <= new Date(this.endDate));
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

  async getUserProgress(userId) {
    const QuestCompletion = (await import('./QuestCompletion.js')).default;
    const completedQuests = await QuestCompletion.find({
      userId,
      campaignId: this._id,
      status: 'completed'
    });

    const completedQuestIds = new Set(completedQuests.map(q => q.questId?.toString()));
    const campaignQuestIds = (this.quests || []).map(q => q.questId?.toString());

    const completedCount = campaignQuestIds.filter(id => completedQuestIds.has(id)).length;
    const totalCount = campaignQuestIds.length;

    return {
      completed: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      isCompleted: totalCount > 0 && completedCount === totalCount
    };
  }

  get questCount() {
    return this.quests?.length || 0;
  }

  async deleteOne() {
    return Campaign.deleteOne({ _id: this._id });
  }
}

export default Campaign;