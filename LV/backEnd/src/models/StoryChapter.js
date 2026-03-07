import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class StoryChapter {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || data.id || `ch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.id = this._id;
    this.storyId = data.storyId || data.story_id;
    this.title = data.title;
    this.content = data.content || '';
    this.orderIndex = data.orderIndex || data.order_index || 0;
    this.subtitle = data.subtitle || '';
    this.authorId = data.authorId || data.author_id;
    this.status = data.status || 'pending';
    this.parentId = data.parentId || data.parent_id || null;
    this.choices = data.choices || [];
    this.unlockConditions = data.unlockConditions || data.unlock_conditions || {};
    this.hint = data.hint || '';
    this.theme = data.theme || 'default';
    this.chapterNumber = data.chapterNumber || data.chapter_number || 0;
    this.order = data.order || this.chapterNumber;
    this.versions = data.versions || [];
    this.unlockedBy = data.unlockedBy || data.unlocked_by || [];
    this.stats = data.stats || { unlockAttempts: 0, views: 0 };
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  static find(query = {}) {
    const dbQuery = {};
    if (query.storyId) dbQuery.story_id = query.storyId;
    if (query.id) dbQuery.id = query.id;
    if (query._id) dbQuery.id = query._id;

    const promise = supabaseService.find('story_chapters', dbQuery).then(data => data.map(ch => new StoryChapter(ch)));
    return new Query(promise, query);
  }

  static async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  static async findById(id) {
    const data = await supabaseService.getRecord(id, 'story_chapters');
    return data ? new StoryChapter(data) : null;
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
      story_id: this.storyId,
      title: this.title,
      subtitle: this.subtitle,
      content: this.content,
      order_index: this.orderIndex,
      chapter_number: this.chapterNumber,
      order: this.order,
      author_id: this.authorId,
      status: this.status,
      parent_id: this.parentId,
      choices: this.choices,
      unlock_conditions: this.unlockConditions,
      hint: this.hint,
      theme: this.theme,
      versions: this.versions,
      unlocked_by: this.unlockedBy,
      stats: this.stats,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };

    await supabaseService.upsert(dataToSave.id, dataToSave, 'story_chapters');
    return this;
  }

  static async create(data) {
    const chapter = new StoryChapter(data);
    await chapter.save();
    return chapter;
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
      await supabaseService.deleteRecord(item.id || item._id, 'story_chapters');
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteOne() {
    return StoryChapter.deleteOne({ id: this.id || this._id });
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
}

export default StoryChapter;
