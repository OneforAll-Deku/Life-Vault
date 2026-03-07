import crypto from 'crypto';
import supabaseService from '../services/supabaseService.js';
import { BADGE_RARITY } from '../config/constants.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class Badge {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `badge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.name = data.name;
    this.description = data.description || '';
    this.shortCode = data.shortCode || data.short_code || 'B' + crypto.randomBytes(3).toString('hex').toUpperCase();
    this.creatorId = data.creatorId || data.creator_id;
    this.campaignId = data.campaignId || data.campaign_id || null;
    this.imageUrl = data.imageUrl || data.image_url;
    this.thumbnailUrl = data.thumbnailUrl || data.thumbnail_url || null;
    this.animatedUrl = data.animatedUrl || data.animated_url || null;
    this.backgroundColor = data.backgroundColor || data.background_color || '#000000';
    this.nftMetadata = data.nftMetadata || data.nft_metadata || { isNft: false };
    this.rarity = data.rarity || BADGE_RARITY.COMMON;
    this.category = data.category || 'achievement';
    this.tier = data.tier || 1;
    this.requirements = data.requirements || {};
    this.stats = data.stats || { totalAwarded: 0, uniqueHolders: 0 };
    this.onChainBadgeId = data.onChainBadgeId || data.on_chain_badge_id || null;
    this.contractAddress = data.contractAddress || data.contract_address || null;
    this.metadataUri = data.metadataUri || data.metadata_uri || null;
    this.isActive = data.isActive ?? data.is_active ?? true;
    this.isTransferable = data.isTransferable ?? data.is_transferable ?? true;
    this.isBurnable = data.isBurnable || data.is_burnable || false;
    this.expiresAt = data.expiresAt || data.expires_at || null;
    this.pointValue = data.pointValue || data.point_value || 0;
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.creatorId) dbQuery.creator_id = query.creatorId;
    if (query.campaignId) dbQuery.campaign_id = query.campaignId;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    // Supabase query
    const promise = supabaseService.find('badges', dbQuery).then(data => data.map(b => new Badge(b)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'badges');
    return data ? new Badge(data) : null;
  }

  toObject() { return { ...this }; }
  populate() { return this; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }
  select() { return this; }

  async save() {
    this.updatedAt = new Date();
    const dataToSave = {
      id: this.id || this._id,
      name: this.name,
      description: this.description,
      short_code: this.shortCode,
      creator_id: this.creatorId,
      campaign_id: this.campaignId,
      image_url: this.imageUrl,
      thumbnail_url: this.thumbnailUrl,
      animated_url: this.animatedUrl,
      background_color: this.backgroundColor,
      nft_metadata: this.nftMetadata,
      rarity: this.rarity,
      category: this.category,
      tier: this.tier,
      requirements: this.requirements,
      stats: this.stats,
      on_chain_badge_id: this.onChainBadgeId,
      contract_address: this.contractAddress,
      metadata_uri: this.metadataUri,
      is_active: this.isActive,
      is_transferable: this.isTransferable,
      is_burnable: this.isBurnable,
      expires_at: this.expiresAt,
      point_value: this.pointValue,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'badges');
    return this;
  }

  static async create(data) {
    const badge = new Badge(data);
    await badge.save();
    return badge;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const item = await this.findOne(query);
    if (item) {
      applyUpdate(item, update);
      await item.save();
      return item;
    }
    return null;
  }

  static async findByIdAndUpdate(id, update) {
    return this.findOneAndUpdate({ id: id }, update);
  }

  static async deleteOne(query) {
    const item = await this.findOne(query);
    if (item) {
      await supabaseService.deleteRecord(item.id || item._id, 'badges');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  static async deleteMany(query) {
    const items = await this.find(query);
    let deletedCount = 0;
    for (const item of items) {
      await this.deleteOne({ id: item.id || item._id });
      deletedCount++;
    }
    return { deletedCount };
  }

  static async findOneAndDelete(query) {
    const item = await this.findOne(query);
    if (item) {
      await this.deleteOne({ id: item.id || item._id });
      return item;
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

  static async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }

  async deleteOne() {
    return Badge.deleteOne({ id: this.id || this._id });
  }

  async awardTo(userId) {
    // Dynamic import to avoid circular dependency
    const User = (await import('./User.js')).default;
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.badges) user.badges = [];

    const alreadyHas = user.badges.find(
      (b) => (b.badgeId || b.badge_id)?.toString() === (this.id || this._id).toString()
    );
    if (alreadyHas) throw new Error('User already has this badge');

    user.badges.push({
      badgeId: this.id || this._id,
      awardedAt: new Date(),
    });

    await user.save();

    this.stats.totalAwarded = (this.stats.totalAwarded || 0) + 1;
    this.stats.uniqueHolders = (this.stats.uniqueHolders || 0) + 1;
    await this.save();

    return true;
  }
}

export default Badge;