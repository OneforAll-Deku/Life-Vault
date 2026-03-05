import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { matchesQuery } from '../utils/queryHelper.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'sharedlinks.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class SharedLink {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `link_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.memoryId = data.memoryId;
    this.userId = data.userId;
    this.token = data.token || SharedLink.generateToken();
    this.shortCode = data.shortCode || SharedLink.generateShortCode();
    this.expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    this.accessType = data.accessType || 'view';
    this.password = data.password || null;
    this.isPasswordProtected = data.isPasswordProtected || false;
    this.isZKProtected = data.isZKProtected || false;
    this.identityCommitment = data.identityCommitment || null;
    this.zkChallenge = data.zkChallenge || null;
    this.encryptedData = data.encryptedData || null;
    this.maxViews = data.maxViews || null;
    this.viewCount = data.viewCount || 0;
    this.isActive = data.isActive ?? true;
    this.isRevoked = data.isRevoked || false;
    this.revokedAt = data.revokedAt || null;
    this.createdAt = data.createdAt || new Date();
    this.lastAccessedAt = data.lastAccessedAt || null;
    this.accessLog = data.accessLog || [];
    this.updatedAt = data.updatedAt || new Date();
  }

  static async find(query = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return items.filter(item => matchesQuery(item, query)).map(item => new SharedLink(item));
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const item = items.find(i => i._id === id);
    return item ? new SharedLink(item) : null;
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
    const item = await this.findById(id);
    if (item) {
      const dataToSet = update.$set || update;
      Object.assign(item, dataToSet);
      await item.save();
      return item;
    }
    return null;
  }

  static async deleteOne(query) {
    let items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const initialLength = items.length;
    items = items.filter(item => !matchesQuery(item, query));
    if (items.length !== initialLength) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
      return { deletedCount: initialLength - items.length };
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

  static async updateMany(query, update) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let modifiedCount = 0;
    const dataToSet = update.$set || update;

    const updatedItems = items.map(item => {
      if (matchesQuery(item, query)) {
        modifiedCount++;
        return { ...item, ...dataToSet, updatedAt: new Date() };
      }
      return item;
    });

    if (modifiedCount > 0) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(updatedItems, null, 2));
    }
    return { modifiedCount };
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

  static async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
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
    const link = new SharedLink(data);
    await link.save();
    return link;
  }

  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateShortCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  isValid() {
    if (this.isRevoked || !this.isActive) return { valid: false, reason: 'Link has been revoked' };
    if (new Date() > new Date(this.expiresAt)) return { valid: false, reason: 'Link has expired' };
    if (this.maxViews !== null && this.viewCount >= this.maxViews) return { valid: false, reason: 'Maximum views reached' };
    return { valid: true };
  }

  async recordAccess(ipAddress, userAgent) {
    this.viewCount += 1;
    this.lastAccessedAt = new Date();
    this.accessLog.push({
      accessedAt: new Date(),
      ipAddress,
      userAgent,
    });
    if (this.accessLog.length > 100) this.accessLog = this.accessLog.slice(-100);
    return this.save();
  }
}

export default SharedLink;