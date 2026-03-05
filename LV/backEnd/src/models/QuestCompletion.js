import fs from 'fs';
import path from 'path';
import { VERIFICATION_RESULT } from '../config/constants.js';

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

  static async find(query = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return items.filter(item => {
      for (let key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) return false;
      }
      return true;
    }).map(item => new QuestCompletion(item));
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async countDocuments(query) {
    const items = await this.find(query);
    return items.length;
  }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const item = items.find(i => i._id === id);
    return item ? new QuestCompletion(item) : null;
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
}

export default QuestCompletion;