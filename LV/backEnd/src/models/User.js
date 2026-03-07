import jwt from 'jsonwebtoken';
import { Account } from '@aptos-labs/ts-sdk';
import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class User {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.name = data.name || (data.email ? data.email.split('@')[0] : 'User');
    this.userType = data.user_type || data.userType || 'user';
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.totalMemories = data.total_memories || data.totalMemories || 0;
    this.storageUsed = data.storage_used || data.storageUsed || 0;
    this.badges = data.badges || [];
    this.questsCompleted = data.quests_completed || data.questsCompleted || [];
    this.achievements = data.achievements || [];
    this.points = data.points || 0;
    this.level = data.level || 1;
    this.preferences = data.preferences || {};
    this.storiesCreated = data.stories_created || data.storiesCreated || [];
    this.digitalWillsCreated = data.digital_wills_created || data.digitalWillsCreated || [];
    this.lastLogin = data.last_login || data.lastLogin || new Date();
    this.isActive = data.is_active ?? data.isActive ?? true;
    this.lastCheckIn = data.last_check_in || data.lastCheckIn || new Date();
    this.aptosAddress = data.aptos_address || data.aptosAddress || '';
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.email) dbQuery.email = query.email;
    if (query.aptosAddress) dbQuery.aptos_address = query.aptosAddress;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('users', dbQuery).then(data => data.map(u => new User(u)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'users');
    return data ? new User(data) : null;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const user = await this.findOne(query);
    if (user) {
      applyUpdate(user, update);
      await user.save();
      return user;
    }
    return null;
  }

  static async findByIdAndUpdate(id, update) {
    return this.findOneAndUpdate({ id: id }, update);
  }

  toObject() {
    return { ...this };
  }

  async save(options = {}) {
    const userData = {
      id: this.id || this._id,
      email: this.email,
      password: this.password,
      name: this.name,
      user_type: this.userType,
      avatar: this.avatar || '',
      bio: this.bio || '',
      aptos_address: this.aptosAddress,
      total_memories: this.totalMemories || 0,
      storage_used: this.storageUsed || 0,
      badges: this.badges || [],
      quests_completed: this.questsCompleted || this.quests_completed || [],
      achievements: this.achievements || [],
      points: this.points || 0,
      level: this.level || 1,
      preferences: this.preferences || {},
      stories_created: this.storiesCreated || [],
      digital_wills_created: this.digitalWillsCreated || [],
      last_login: this.lastLogin || new Date(),
      is_active: this.isActive ?? true,
      last_check_in: this.lastCheckIn || new Date(),
    };

    await supabaseService.upsert(userData.id, userData, 'users');
    return this;
  }

  async comparePassword(candidatePassword) {
    return candidatePassword === this.password; // Simplified for demo as in original
  }

  generateAuthToken() {
    return jwt.sign(
      {
        id: this.id || this._id,
        email: this.email,
        aptosAddress: this.aptosAddress,
        userType: this.userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  async generateAptosWallet() {
    const account = Account.generate();
    this.aptosAddress = account.accountAddress.toString();
    return this.aptosAddress;
  }

  select(fields) { return this; }
  populate() { return this; }
  sort() { return this; }

  static async deleteMany(query) {
    const users = await this.find(query);
    let deletedCount = 0;
    for (const u of users) {
      await supabaseService.deleteRecord(u.id || u._id, 'users');
      deletedCount++;
    }
    return { deletedCount };
  }

  static async deleteOne(query) {
    const user = await this.findOne(query);
    if (user) {
      await supabaseService.deleteRecord(user.id || user._id, 'users');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  static async findOneAndDelete(query) {
    const user = await this.findOne(query);
    if (user) {
      await this.deleteOne({ id: user.id || user._id });
      return user;
    }
    return null;
  }

  static async updateMany(query, update) {
    const users = await this.find(query);
    let modifiedCount = 0;
    for (const user of users) {
      applyUpdate(user, update);
      await user.save();
      modifiedCount++;
    }
    return { modifiedCount };
  }

  static async countDocuments(query = {}) {
    const users = await this.find(query);
    return users.length;
  }
}

export default User;