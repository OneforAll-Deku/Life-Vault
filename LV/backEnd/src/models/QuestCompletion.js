import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class QuestCompletion {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `qc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.userId = data.userId || data.user_id;
    this.questId = data.questId || data.quest_id;
    this.campaignId = data.campaignId || data.campaign_id;
    this.submissionData = data.submissionData || data.submission_data || {};
    this.rewards = data.rewards || { points: 0, xp: 0, aptAmount: 0 };
    this.completedAt = data.completedAt || data.completed_at || null;
    this.txHash = data.txHash || data.tx_hash || null;
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.userId) dbQuery.user_id = query.userId;
    if (query.questId) dbQuery.quest_id = query.questId;
    if (query.campaignId) dbQuery.campaign_id = query.campaignId;
    if (query.status) dbQuery.status = query.status;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('quest_completions', dbQuery).then(data => data.map(qc => new QuestCompletion(qc)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'quest_completions');
    return data ? new QuestCompletion(data) : null;
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
      user_id: this.userId,
      quest_id: this.questId,
      campaign_id: this.campaignId,
      status: this.status,
      submission_data: this.submissionData,
      completed_at: this.completedAt,
      tx_hash: this.txHash,
      rewards: this.rewards,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'quest_completions');
    return this;
  }

  static async create(data) {
    const qc = new QuestCompletion(data);
    await qc.save();
    return qc;
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
      await supabaseService.deleteRecord(item.id || item._id, 'quest_completions');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteOne() {
    return QuestCompletion.deleteOne({ id: this.id || this._id });
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

  static async aggregate(pipeline) {
    // Pipeline usually starts with $match
    let results = [];
    const matchStage = pipeline.find(p => p.$match);
    if (matchStage) {
      results = await this.find(matchStage.$match);
    } else {
      results = await this.find({});
    }

    // Handle $group for leaderboard specifically
    const groupStage = pipeline.find(p => p.$group);
    if (groupStage) {
      const grouped = {};
      results.forEach(res => {
        const id = res.userId || res.user_id;
        if (!grouped[id]) {
          grouped[id] = {
            _id: id,
            questsCompleted: new Set(),
            totalPoints: 0,
            totalApt: 0,
            firstCompletion: res.completedAt,
            lastCompletion: res.completedAt
          };
        }
        const g = grouped[id];
        g.questsCompleted.add(res.questId || res.quest_id);
        g.totalPoints += (res.rewards?.points || 0);
        g.totalApt += (res.rewards?.aptAmount || 0);
        if (res.completedAt < g.firstCompletion) g.firstCompletion = res.completedAt;
        if (res.completedAt > g.lastCompletion) g.lastCompletion = res.completedAt;
      });

      results = Object.values(grouped).map(g => ({
        ...g,
        questsCompleted: Array.from(g.questsCompleted)
      }));
    }

    // Handle $addFields
    const addFieldsStage = pipeline.find(p => p.$addFields);
    if (addFieldsStage) {
      results = results.map(res => {
        const newRes = { ...res };
        if (addFieldsStage.$addFields.questCount) {
          newRes.questCount = res.questsCompleted.length;
        }
        return newRes;
      });
    }

    // Handle $sort
    const sortStage = pipeline.find(p => p.$sort);
    if (sortStage) {
      const sortKey = Object.keys(sortStage.$sort)[0];
      const sortDir = sortStage.$sort[sortKey];
      results.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return -1 * sortDir;
        if (a[sortKey] > b[sortKey]) return 1 * sortDir;
        return 0;
      });
    }

    // Handle $limit
    const limitStage = pipeline.find(p => p.$limit);
    if (limitStage) {
      results = results.slice(0, limitStage.$limit);
    }

    // Handle $lookup and $unwind specifically for users if present
    // This part is very specific to the current leaderboard implementation
    const lookupStage = pipeline.find(p => p.$lookup);
    if (lookupStage && lookupStage.$lookup.from === 'users') {
      const User = (await import('./User.js')).default;
      results = await Promise.all(results.map(async (res) => {
        const user = await User.findById(res._id);
        return {
          ...res,
          user: user ? user.toObject() : null
        };
      }));
    }

    const unwindStage = pipeline.find(p => p.$unwind);
    if (unwindStage && unwindStage.$unwind === '$user') {
      results = results.filter(res => res.user !== null);
    }

    // Handle $project
    const projectStage = pipeline.find(p => p.$project);
    if (projectStage) {
      results = results.map(res => {
        const projected = {};
        for (const [key, value] of Object.entries(projectStage.$project)) {
          if (value === 1) {
            projected[key] = res[key];
          } else if (typeof value === 'string' && value.startsWith('$')) {
            const path = value.slice(1);
            // Simple path resolution
            const parts = path.split('.');
            let val = res;
            for (const part of parts) { val = val?.[part]; }
            projected[key] = val;
          }
        }
        return projected;
      });
    }

    return results;
  }
}

export default QuestCompletion;