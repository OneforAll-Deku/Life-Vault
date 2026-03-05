import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { matchesQuery } from '../utils/queryHelper.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'storychapters.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class StoryChapter {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `chap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.storyId = data.storyId;
    this.chapterNumber = data.chapterNumber;
    this.authorId = data.authorId;
    this.status = data.status || 'approved';
    this.parentId = data.parentId || null;
    this.choices = data.choices || [];
    this.title = data.title || '';
    this.subtitle = data.subtitle || '';
    this.content = data.content || {};
    this.unlockConditions = data.unlockConditions || { requirePreviousChapter: true };
    this.hint = data.hint || { text: '' };
    this.theme = data.theme || {};
    this.stats = data.stats || { viewCount: 0, unlockAttempts: 0 };
    this.unlockedBy = data.unlockedBy || [];
    this.order = data.order || 0;
    this.versions = data.versions || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async find(query = {}) {
    try {
      const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return items.filter(item => matchesQuery(item, query)).map(item => new StoryChapter(item));
    } catch (err) {
      console.error('Error reading storychapters.json:', err.message);
      return [];
    }
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const item = items.find(i => i._id === id);
    return item ? new StoryChapter(item) : null;
  }

  toObject() {
    return { ...this };
  }

  populate() { return this; }
  select() { return this; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }

  static async deleteMany(query) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const filtered = items.filter(item => !matchesQuery(item, query));
    fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
    return { deletedCount: items.length - filtered.length };
  }

  static async deleteOne(query) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const index = items.findIndex(item => matchesQuery(item, query));
    if (index !== -1) {
      items.splice(index, 1);
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  static async findOneAndDelete(query) {
    const item = await this.findOne(query);
    if (item) {
      await this.deleteOne({ _id: item._id });
      return item;
    }
    return null;
  }

  async deleteOne() {
    return StoryChapter.deleteOne({ _id: this._id });
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
    const chapter = new StoryChapter(data);
    await chapter.save();
    return chapter;
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

  async checkUnlockConditions(userId, submittedData = {}) {
    const conditions = this.unlockConditions;
    const results = { unlocked: true, checks: [], reason: null };

    // 1. Previous chapter requirement
    if (conditions.requirePreviousChapter && this.chapterNumber > 1) {
      const previous = await StoryChapter.findOne({
        storyId: this.storyId,
        chapterNumber: this.chapterNumber - 1,
      });
      const hasUnlockedPrev = previous?.unlockedBy?.some(u => u.userId?.toString() === userId.toString());
      if (!hasUnlockedPrev) {
        results.unlocked = false;
        results.reason = 'Complete the previous chapter first';
        return results;
      }
    }

    // 2. Encryption/Password
    if (conditions.password?.enabled) {
      if (!submittedData.password) {
        results.unlocked = false;
        results.reason = conditions.password.hint || 'Password required';
        return results;
      }
      const isMatch = await bcrypt.compare(submittedData.password, conditions.password.hash);
      if (!isMatch) {
        results.unlocked = false;
        results.reason = 'Incorrect password';
        return results;
      }
    }

    return results;
  }

  async recordUnlock(userId, method) {
    if (!this.unlockedBy) this.unlockedBy = [];
    this.unlockedBy.push({
      userId,
      unlockedAt: new Date(),
      method,
    });
    if (!this.stats) this.stats = { viewCount: 0, unlockAttempts: 0 };
    this.stats.viewCount += 1;
    return this.save();
  }
}

export default StoryChapter;
