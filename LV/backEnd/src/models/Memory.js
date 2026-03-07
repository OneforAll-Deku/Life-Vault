import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class Memory {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.userId = data.userId || data.user_id;
    this.title = data.title;
    this.description = data.description || '';
    this.category = data.category || 'other';
    this.ipfsHash = data.ipfsHash || data.ipfs_hash;
    this.ipfsUrl = data.ipfsUrl || data.ipfs_url;
    this.txHash = data.txHash || data.tx_hash || null;
    this.network = data.network || 'devnet';
    this.blockNumber = data.blockNumber || data.block_number || null;
    this.isOnChain = data.isOnChain || data.is_on_chain || false;
    this.fileType = data.fileType || data.file_type;
    this.fileSize = data.fileSize || data.file_size;
    this.fileName = data.fileName || data.file_name;
    this.isCapsule = data.isCapsule || data.is_capsule || false;
    this.releaseTimestamp = data.releaseTimestamp || data.release_timestamp || null;
    this.beneficiaryAddress = data.beneficiaryAddress || data.beneficiary_address || null;
    this.isClaimed = data.isClaimed || data.is_claimed || false;
    this.isEncrypted = data.isEncrypted ?? data.is_encrypted ?? true;
    this.encryptionMethod = data.encryptionMethod || data.encryption_method || 'AES-256-GCM';
    this.sharedWith = data.sharedWith || data.shared_with || [];
    this.beneficiaries = data.beneficiaries || data.beneficiaries || [];
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
    this.embedding = data.embedding || null;
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.userId) dbQuery.user_id = query.userId;
    if (query.category) dbQuery.category = query.category;
    if (query.isCapsule !== undefined) dbQuery.is_capsule = query.isCapsule;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('memories', dbQuery).then(data => data.map(item => new Memory(item)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'memories');
    return data ? new Memory(data) : null;
  }

  async save(options = {}) {
    this.updatedAt = new Date();
    const dataToSave = {
      id: this.id || this._id,
      user_id: this.userId,
      title: this.title,
      description: this.description,
      category: this.category,
      ipfs_hash: this.ipfsHash,
      ipfs_url: this.ipfsUrl,
      tx_hash: this.txHash,
      network: this.network,
      block_number: this.blockNumber,
      is_on_chain: this.isOnChain,
      file_type: this.fileType,
      file_size: this.fileSize,
      file_name: this.fileName,
      is_capsule: this.isCapsule,
      release_timestamp: this.releaseTimestamp,
      beneficiary_address: this.beneficiaryAddress,
      is_claimed: this.isClaimed,
      is_encrypted: this.isEncrypted,
      encryption_method: this.encryptionMethod,
      shared_with: this.sharedWith,
      beneficiaries: this.beneficiaries,
      embedding: this.embedding,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'memories');
    return this;
  }

  static async semanticSearch(embedding, userId, limit = 5) {
    const results = await supabaseService.semanticSearch(embedding, userId, limit);
    return results.map(res => ({
      ...res.metadata,
      score: res.score
    }));
  }

  static async deleteOne(query) {
    const memory = await this.findOne(query);
    if (memory) {
      await supabaseService.deleteRecord(memory.id || memory._id, 'memories');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  static async findOneAndDelete(query) {
    const memory = await this.findOne(query);
    if (memory) {
      await supabaseService.deleteRecord(memory.id || memory._id, 'memories');
      return memory;
    }
    return null;
  }

  static async findByIdAndUpdate(id, update) {
    const memory = await this.findById(id);
    if (memory) {
      applyUpdate(memory, update);
      await memory.save();
      return memory;
    }
    return null;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const memory = await this.findOne(query);
    if (memory) {
      applyUpdate(memory, update);
      await memory.save();
      return memory;
    }
    return null;
  }

  static async updateMany(query, update) {
    const items = await this.find(query);
    let modifiedCount = 0;
    for (const item of items) {
      applyUpdate(item, update);
      await item.save();
      modifiedCount++;
    }
    return { modifiedCount };
  }

  toObject() { return { ...this }; }
  populate() { return this; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }
  select() { return this; }
}

export default Memory;
