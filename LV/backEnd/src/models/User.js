import jwt from 'jsonwebtoken';
import { Account } from '@aptos-labs/ts-sdk';
import fs from 'fs';
import path from 'path';
import pineconeService from '../services/pineconeService.js';
import { matchesQuery } from '../utils/queryHelper.js';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Ensure users file exists
if (!fs.existsSync(path.dirname(USERS_FILE))) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

class User {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.name = data.name || (data.email ? data.email.split('@')[0] : 'User');
    this.userType = data.userType || 'user';
    this.createdAt = data.createdAt || new Date();
    this.totalMemories = data.totalMemories || 0;
    this.storageUsed = data.storageUsed || 0;
  }

  static async find(query = {}) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return users.filter(u => matchesQuery(u, query)).map(u => new User(u));
  }

  static async findOne(query) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    let userData = users.find(u => matchesQuery(u, query));

    if (!userData && query.email) {
      console.log(`🔍 User ${query.email} not in local JSON. Checking Pinecone...`);
      userData = await pineconeService.findUserByEmail(query.email);
      if (userData) {
        // Rehydrate locally
        const user = new User(userData);
        await user.save({ skipPinecone: true });
        return user;
      }
    }

    return userData ? new User(userData) : null;
  }

  static async findById(id) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    let userData = users.find(u => u._id === id);

    if (!userData) {
      console.log(`🔍 User ${id} not in local JSON. Checking Pinecone...`);
      const pineconeRecord = await pineconeService.getRecord(id, 'users');
      if (pineconeRecord) {
        userData = pineconeRecord.metadata || pineconeRecord;
        if (userData) {
          const user = new User(userData);
          await user.save({ skipPinecone: true });
          return user;
        }
      }
    }

    return userData ? new User(userData) : null;
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
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const index = users.findIndex(u => u._id === id);
    if (index !== -1) {
      const user = users[index];

      // Handle $push
      if (update.$push) {
        for (let key in update.$push) {
          if (!Array.isArray(user[key])) user[key] = [];
          user[key].push(update.$push[key]);
        }
      }

      // Handle $set or direct update
      const dataToSet = update.$set || update;
      for (let key in dataToSet) {
        if (key.startsWith('$')) continue;
        user[key] = dataToSet[key];
      }

      users[index] = user;
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      return new User(users[index]);
    }
    return null;
  }

  toObject() {
    return { ...this };
  }

  async save(options = {}) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const index = users.findIndex(u => u._id === this._id || (u.email && u.email === this.email));

    if (index !== -1) {
      users[index] = { ...users[index], ...this };
    } else {
      users.push(this);
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    // Also sync to Pinecone for permanent persistence (unless skipping)
    if (!options.skipPinecone) {
      await pineconeService.upsertUser(this);
    }

    return this;
  }

  async comparePassword(candidatePassword) {
    return candidatePassword === this.password; // Simplified for demo
  }

  generateAuthToken() {
    return jwt.sign(
      {
        id: this._id,
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

  select(fields) {
    // Mocking select behavior
    return this;
  }

  populate() { return this; }
  sort() { return this; }

  static async deleteMany(query) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const filtered = users.filter(u => !matchesQuery(u, query));
    fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2));
    return { deletedCount: users.length - filtered.length };
  }

  static async deleteOne(query) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const index = users.findIndex(u => matchesQuery(u, query));
    if (index !== -1) {
      const deleted = users.splice(index, 1);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  static async findOneAndDelete(query) {
    const user = await this.findOne(query);
    if (user) {
      await this.deleteOne({ _id: user._id });
      return user;
    }
    return null;
  }

  static async updateMany(query, update) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    let modifiedCount = 0;
    const dataToSet = update.$set || update;

    const updatedUsers = users.map(user => {
      if (matchesQuery(user, query)) {
        modifiedCount++;
        return { ...user, ...dataToSet, updatedAt: new Date() };
      }
      return user;
    });

    if (modifiedCount > 0) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(updatedUsers, null, 2));
    }
    return { modifiedCount };
  }

  static async countDocuments(query = {}) {
    const users = await this.find(query);
    return users.length;
  }
}

export default User;