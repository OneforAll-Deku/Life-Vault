import supabaseService from '../services/supabaseService.js';
import { QUEST_STATUS } from '../config/constants.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class Quest {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `quest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.campaignId = data.campaignId || data.campaign_id;
    this.title = data.title;
    this.description = data.description || '';
    this.questType = data.questType || data.quest_type || 'social';
    this.rewardType = data.rewardType || data.reward_type || 'xp';
    this.rewardValue = data.rewardValue || data.reward_value || 0;
    this.requirements = data.requirements || [];
    this.instructions = data.instructions || '';
    this.orderIndex = data.orderIndex || data.order_index || 0;
    this.isActive = data.isActive ?? data.is_active ?? true;
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.campaignId) dbQuery.campaign_id = query.campaignId;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('quests', dbQuery).then(data => data.map(q => new Quest(q)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'quests');
    return data ? new Quest(data) : null;
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
      campaign_id: this.campaignId,
      title: this.title,
      description: this.description,
      quest_type: this.questType,
      reward_type: this.rewardType,
      reward_value: this.rewardValue,
      requirements: this.requirements,
      instructions: this.instructions,
      order_index: this.orderIndex,
      is_active: this.isActive,
      location: this.location,
      difficulty: this.difficulty,
      cover_image: this.coverImage,
      rewards: this.rewards,
      category: this.category,
      stats: this.stats,
      status: this.status,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'quests');
    return this;
  }

  static async create(data) {
    const quest = new Quest(data);
    await quest.save();
    return quest;
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
      await supabaseService.deleteRecord(item.id || item._id, 'quests');
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

  async deleteOne() {
    return Quest.deleteOne({ id: this.id || this._id });
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

  async remainingCompletions() {
    return 1000; // Mocked
  }

  async canUserAttempt(userId) {
    return true; // Mocked
  }

  static async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }

  static async findNearby(longitude, latitude, radiusMeters, options = {}) {
    // Fetch all active quests with locations
    const allQuests = await this.find({ isActive: true });

    const nearby = allQuests.filter(quest => {
      if (!quest.location || !quest.location.coordinates || !quest.location.coordinates.coordinates) {
        return false;
      }

      const [qLon, qLat] = quest.location.coordinates.coordinates;
      const dist = this.calculateDistance(latitude, longitude, qLat, qLon);
      return dist <= (radiusMeters || quest.location.radiusMeters || 5000);
    });

    // Sort by distance if needed, or just return
    if (options.limit) {
      return nearby.slice(0, options.limit);
    }
    return nearby;
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export default Quest;