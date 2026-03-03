import fs from 'fs';
import path from 'path';

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
    return items.filter(item => {
      for (let key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) return false;
      }
      return true;
    }).map(item => new Memory(item));
  }

  static async findById(id) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const item = items.find(i => i._id === id);
    return item ? new Memory(item) : null;
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
    const memory = new Memory(data);
    await memory.save();
    return memory;
  }

  static async findOneAndDelete(query) {
    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const index = items.findIndex(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    if (index !== -1) {
      const deleted = items.splice(index, 1);
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
      return new Memory(deleted[0]);
    }
    return null;
  }
}

export default Memory;
