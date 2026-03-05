import fs from 'fs';
import path from 'path';
import { VERIFICATION_RESULT } from '../config/constants.js';
import { matchesQuery, Query } from '../utils/queryHelper.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'questcompletions.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class QuestCompletion {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `compl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.questId = data.questId;
    this.userId = data.userId;
    this.campaignId = data.campaignId || null;
    this.status = data.status || 'pending';
    this.attemptNumber = data.attemptNumber || 1;
    this.submission = data.submission || { submittedAt: new Date() };
    this.verification = data.verification || { overallResult: VERIFICATION_RESULT.PENDING, overallScore: 0 };
    this.rewards = data.rewards || { aptAmount: 0, points: 0 };
    this.blockchain = data.blockchain || {};
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;
    this.failedAt = data.failedAt || null;
    this.failure = data.failure || { canRetry: true };
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static find(query = {}) {
    try {
      if (!fs.existsSync(DATA_FILE)) return new Query([]);
      const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const results = items.filter(item => matchesQuery(item, query)).map(item => new QuestCompletion(item));
      return new Query(results);
    } catch (err) {
      console.error('Error reading questcompletions.json:', err.message);
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

  static async countDocuments(query = {}) {
    const q = this.find(query);
    const results = await q;
    return results.length;
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
    const completion = new QuestCompletion(data);
    await completion.save();
    return completion;
  }

  async markAsCompleted(verificationData, rewardsData, blockchainData) {
    this.status = 'completed';
    this.completedAt = new Date();
    if (verificationData) {
      this.verification = { ...this.verification, ...verificationData, overallResult: VERIFICATION_RESULT.PASSED, completedAt: new Date() };
    }
    if (rewardsData) this.rewards = rewardsData;
    if (blockchainData) this.blockchain = blockchainData;
    return this.save();
  }

  async markAsFailed(failureCode, reason, details = {}) {
    this.status = 'failed';
    this.failedAt = new Date();
    this.failure = {
      code: failureCode,
      reason,
      details,
      canRetry: !['ALREADY_COMPLETED', 'QUEST_EXPIRED', 'SPOOFING_DETECTED'].includes(failureCode)
    };
    this.verification.overallResult = VERIFICATION_RESULT.FAILED;
    this.verification.completedAt = new Date();
    return this.save();
  }

  static async findOneAndUpdate(query, update) {
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

  async deleteOne() {
    return QuestCompletion.deleteOne({ _id: this._id });
  }
}

export default QuestCompletion;