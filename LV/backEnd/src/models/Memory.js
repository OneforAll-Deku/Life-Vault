import fs from 'fs';
import path from 'path';
import pineconeService from '../services/pineconeService.js';
import { matchesQuery } from '../utils/queryHelper.js';


const DATA_FILE = path.join(process.cwd(), 'data', 'memories.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class Memory {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.userId = data.userId;
    this.title = data.title;
    this.description = data.description || '';
    this.category = data.category || 'other';
    this.ipfsHash = data.ipfsHash;
    this.ipfsUrl = data.ipfsUrl;
    this.txHash = data.txHash || null;
    this.blockNumber = data.blockNumber || null;
    this.isOnChain = data.isOnChain || false;
    this.fileType = data.fileType;
    this.fileSize = data.fileSize;
    this.fileName = data.fileName;
    this.isCapsule = data.isCapsule || false;
    this.releaseTimestamp = data.releaseTimestamp || null;
    this.beneficiaryAddress = data.beneficiaryAddress || null;
    this.isClaimed = data.isClaimed || false;
    this.isEncrypted = data.isEncrypted ?? true;
    this.encryptionMethod = data.encryptionMethod || 'AES-256-GCM';
    this.sharedWith = data.sharedWith || [];
    this.beneficiaries = data.beneficiaries || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async find(query = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let filteredItems = items.filter(item => matchesQuery(item, query));

    // Fallback if no items found and we have a userId
    if (filteredItems.length === 0 && query.userId && typeof query.userId === 'string') {
      console.log(`🔍 Memories for ${query.userId} not in local JSON. checking Pinecone...`);
      const pineconeItems = await pineconeService.listRecords(query.userId, 'memories');
      if (pineconeItems && pineconeItems.length > 0) {
        // Rehydrate locally
        for (const item of pineconeItems) {
          const memory = new Memory(item);
          await memory.save({ skipPinecone: true });
        }
        return pineconeItems.map(item => new Memory(item));
      }
    }

    return filteredItems.map(item => new Memory(item));
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  toObject() {
    return { ...this };
  }

  populate() { return this; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }
  select() { return this; }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let item = items.find(i => i._id === id);

    if (!item) {
      console.log(`🔍 Memory ${id} not in local JSON. Checking Pinecone...`);
      const pineconeRecord = await pineconeService.getRecord(id, 'memories');
      if (pineconeRecord) {
        item = pineconeRecord;
        const memory = new Memory(item);
        await memory.save({ skipPinecone: true });
        return memory;
      }
    }

    return item ? new Memory(item) : null;
  }

  async save(options = {}) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    this.updatedAt = new Date();
    const index = items.findIndex(i => i._id === this._id);
    if (index !== -1) {
      items[index] = { ...this };
    } else {
      items.push({ ...this });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

    // Sync to Pinecone
    if (!options.skipPinecone) {
      await pineconeService.upsertMemory(this);
    }

    return this;
  }

  static async create(data) {
    const memory = new Memory(data);
    await memory.save();
    return memory;
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

      // Also delete from Pinecone
      await pineconeService.deleteRecord(item._id, 'memories');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
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

  static async findOneAndDelete(query) {
    const item = await this.findOne(query);
    if (item) {
      await this.deleteOne({ _id: item._id });
      return item;
    }
    return null;
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
}

export default Memory;
