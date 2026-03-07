import crypto from 'crypto';
import supabaseService from '../services/supabaseService.js';
import { QUEST_STATUS } from '../config/constants.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class Campaign {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `camp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.name = data.name;
    this.description = data.description || '';
    this.shortCode = data.shortCode || data.short_code || 'C' + crypto.randomBytes(4).toString('hex').toUpperCase();
    this.organizationId = data.organizationId || data.organization_id;
    this.organizationType = data.organizationType || data.organization_type;
    this.organizationName = data.organizationName || data.organization_name || '';
    this.organizationLogo = data.organizationLogo || data.organization_logo || null;
    this.website = data.website || '';
    this.contactEmail = data.contactEmail || data.contact_email || '';
    this.campaignType = data.campaignType || data.campaign_type;
    this.quests = data.quests || [];
    this.completionRequirements = data.completionRequirements || data.completion_requirements || { sequentialCompletion: false };
    this.grandPrize = data.grandPrize || data.grand_prize || { enabled: false };
    this.budget = data.budget || { totalAptAllocated: 0 };
    this.status = data.status || QUEST_STATUS.DRAFT;
    this.startDate = data.startDate || data.start_date || null;
    this.endDate = data.endDate || data.end_date || null;
    this.timezone = data.timezone || 'UTC';
    this.targetRegions = data.targetRegions || data.target_regions || [];
    this.stats = data.stats || {};
    this.coverImage = data.coverImage || data.cover_image || null;
    this.bannerImage = data.bannerImage || data.banner_image || null;
    this.promoVideo = data.promoVideo || data.promo_video || null;
    this.gallery = data.gallery || [];
    this.onChainCampaignId = data.onChainCampaignId || data.on_chain_campaign_id || null;
    this.escrowAddress = data.escrowAddress || data.escrow_address || null;
    this.txHash = data.txHash || data.tx_hash || null;
    this.settings = data.settings || { isPublic: true };
    this.tags = data.tags || [];
    this.category = data.category || 'other';
    this.isVerified = data.isVerified || data.is_verified || false;
    this.verifiedAt = data.verifiedAt || data.verified_at || null;
    this.verifiedBy = data.verifiedBy || data.verified_by || null;
    this.isFeatured = data.isFeatured || data.is_featured || false;
    this.isSponsored = data.isSponsored || data.is_sponsored || false;
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.creatorId) dbQuery.creator_id = query.creatorId;
    if (query.organizationId) dbQuery.organization_id = query.organizationId;
    if (query.status) dbQuery.status = query.status;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('campaigns', dbQuery).then(data => data.map(c => new Campaign(c)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'campaigns');
    return data ? new Campaign(data) : null;
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
      organization_id: this.organizationId,
      organization_type: this.organizationType,
      organization_name: this.organizationName,
      organization_logo: this.organizationLogo,
      website: this.website,
      contact_email: this.contactEmail,
      campaign_type: this.campaignType,
      quests: this.quests,
      completion_requirements: this.completionRequirements,
      grand_prize: this.grandPrize,
      budget: this.budget,
      status: this.status,
      start_date: this.startDate,
      end_date: this.endDate,
      timezone: this.timezone,
      target_regions: this.targetRegions,
      stats: this.stats,
      cover_image: this.coverImage,
      banner_image: this.bannerImage,
      promo_video: this.promoVideo,
      gallery: this.gallery,
      on_chain_campaign_id: this.onChainCampaignId,
      escrow_address: this.escrowAddress,
      tx_hash: this.txHash,
      settings: this.settings,
      tags: this.tags,
      category: this.category,
      is_verified: this.isVerified,
      verified_at: this.verifiedAt,
      verified_by: this.verifiedBy,
      is_featured: this.isFeatured,
      is_sponsored: this.isSponsored,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'campaigns');
    return this;
  }

  static async create(data) {
    const campaign = new Campaign(data);
    await campaign.save();
    return campaign;
  }

  get isActive() {
    const now = new Date();
    return this.status === QUEST_STATUS.ACTIVE &&
      (!this.startDate || now >= new Date(this.startDate)) &&
      (!this.endDate || now <= new Date(this.endDate));
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
      await supabaseService.deleteRecord(item.id || item._id, 'campaigns');
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

  static async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }

  async getUserProgress(userId) {
    // Basic implementation since we're using models instead of SQL joins directly
    const QuestCompletion = (await import('./QuestCompletion.js')).default;
    const completedQuests = await QuestCompletion.find({
      userId,
      campaignId: this.id || this._id,
      status: 'completed'
    });

    const completedQuestIds = new Set(completedQuests.map(q => (q.questId || q.quest_id)?.toString()));
    const campaignQuestIds = (this.quests || []).map(q => (q.questId || q.id)?.toString());

    const completedCount = campaignQuestIds.filter(id => completedQuestIds.has(id)).length;
    const totalCount = campaignQuestIds.length;

    return {
      completed: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      isCompleted: totalCount > 0 && completedCount === totalCount
    };
  }

  get questCount() {
    return this.quests?.length || 0;
  }

  async deleteOne() {
    return Campaign.deleteOne({ id: this.id || this._id });
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
}

export default Campaign;