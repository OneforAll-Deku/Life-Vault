import crypto from 'crypto';
import supabaseService from '../services/supabaseService.js';
import { Query } from '../utils/queryHelper.js';
import { applyUpdate } from '../utils/modelHelper.js';

class DigitalWill {
    constructor(data) {
        Object.assign(this, data);
        this._id = data._id || data.id || `will_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.id = this._id;
        this.userId = data.userId || data.user_id;
        this.title = data.title || 'My Digital Legacy';
        this.description = data.description || '';
        this.status = data.status || 'draft';
        this.beneficiaries = data.beneficiaries || [];
        this.multiSig = data.multiSig || data.multi_sig || { enabled: true, requiredConfirmations: 2 };
        this.deadManSwitch = data.deadManSwitch || data.dead_man_switch || { enabled: false, inactivityMonths: 6 };
        this.notarization = data.notarization || { isNotarized: false };
        this.legalTemplate = data.legalTemplate || data.legal_template || { type: 'standard' };
        this.globalMemories = data.globalMemories || data.global_memories || [];
        this.executedAt = data.executedAt || data.executed_at || null;
        this.executionTxHash = data.executionTxHash || data.execution_tx_hash || null;
        this.activityLog = data.activityLog || data.activity_log || [];
        this.accessToken = data.accessToken || data.access_token || crypto.randomBytes(32).toString('hex');
        this.createdAt = data.createdAt || data.created_at || new Date();
        this.updatedAt = data.updatedAt || data.updated_at || new Date();
    }

    static find(query = {}) {
        const dbQuery = {};
        if (query.userId) dbQuery.user_id = query.userId;
        if (query.status) dbQuery.status = query.status;
        if (query.id) dbQuery.id = query.id;
        if (query._id) dbQuery.id = query._id;

        const promise = supabaseService.find('digital_wills', dbQuery).then(data => data.map(w => new DigitalWill(w)));
        return new Query(promise, query);
    }

    static async findOne(query) {
        const items = await this.find(query);
        return items.length > 0 ? items[0] : null;
    }

    static async findById(id) {
        const data = await supabaseService.getRecord(id, 'digital_wills');
        return data ? new DigitalWill(data) : null;
    }

    async save() {
        this.updatedAt = new Date();

        // Calculate nextDeadline if deadManSwitch is enabled
        if (this.deadManSwitch && this.deadManSwitch.enabled) {
            const lastCheckin = this.deadManSwitch.lastCheckinAt || this.createdAt || new Date();
            const months = this.deadManSwitch.inactivityMonths || 12; // Default to 12 if not set
            const deadline = new Date(lastCheckin);
            deadline.setMonth(deadline.getMonth() + months);
            this.deadManSwitch.nextDeadline = deadline;
            this.deadManSwitch.isTriggered = this.deadManSwitch.isTriggered || false;
            this.deadManSwitch.warningsSent = this.deadManSwitch.warningsSent || 0;
        }

        const dataToSave = {
            id: this.id || this._id,
            user_id: this.userId,
            title: this.title,
            description: this.description,
            status: this.status,
            beneficiaries: this.beneficiaries,
            multi_sig: this.multiSig,
            dead_man_switch: this.deadManSwitch,
            notarization: this.notarization,
            legal_template: this.legalTemplate,
            global_memories: this.globalMemories,
            executed_at: this.executedAt,
            execution_tx_hash: this.executionTxHash,
            activity_log: this.activityLog,
            access_token: this.accessToken,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };

        await supabaseService.upsert(dataToSave.id, dataToSave, 'digital_wills');
        return this;
    }

    // Business Logic Methods
    generateContentHash() {
        const content = JSON.stringify({
            beneficiaries: this.beneficiaries,
            memories: this.globalMemories,
            multiSig: this.multiSig,
            deadManSwitch: this.deadManSwitch
        });
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    checkin() {
        if (this.deadManSwitch && this.deadManSwitch.enabled) {
            this.deadManSwitch.lastCheckinAt = new Date();
            this.logActivity('check-in', this.userId, { method: 'dashboard' });
            return this.save();
        }
    }

    isUnlockable() {
        const currentConfirmations = (this.beneficiaries || []).filter(b => b.hasConfirmed).length;
        this.multiSig = this.multiSig || { enabled: false, requiredConfirmations: 0 };
        this.multiSig.currentConfirmations = currentConfirmations;

        if (!this.multiSig.enabled) {
            return this.status === 'active';
        }

        const requiredConfirmations = this.multiSig.requiredConfirmations || 1;
        return currentConfirmations >= requiredConfirmations && this.status === 'active';
    }

    logActivity(action, userId, details, txHash = null) {
        this.activityLog.push({
            action,
            performedBy: userId,
            details,
            txHash,
            timestamp: new Date()
        });
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

    static async findOneAndDelete(query) {
        const item = await this.findOne(query);
        if (item) {
            await supabaseService.deleteRecord(item.id || item._id, 'digital_wills');
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
            await supabaseService.deleteRecord(item.id || item._id, 'digital_wills');
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

    static async create(data) {
        const will = new DigitalWill(data);
        await will.save();
        return will;
    }

    toObject() { return { ...this }; }
    populate() { return this; }
    sort() { return this; }
    limit() { return this; }
    skip() { return this; }
    select() { return this; }
}

export default DigitalWill;
