import jwt from 'jsonwebtoken';
import { Account } from '@aptos-labs/ts-sdk';
import fs from 'fs';
import path from 'path';
import pineconeService from '../services/pineconeService.js';


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

  static async findOne(query) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    let userData = users.find(u => {
      if (query.email && u.email === query.email) return true;
      if (query.aptosAddress && u.aptosAddress === query.aptosAddress) return true;
      if (query.bitcoinAddress && u.bitcoinAddress === query.bitcoinAddress) return true;
      return false;
    });

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

  static async findByIdAndUpdate(id, update) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const index = users.findIndex(u => u._id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...update };
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      return new User(users[index]);
    }
    return null;
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
}

export default User;