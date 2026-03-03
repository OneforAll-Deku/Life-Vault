import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'digitalwills.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

class DigitalWill {
    constructor(data) {
        this._id = data._id || `will_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.userId = data.userId;
        this.title = data.title || 'My Digital Legacy';
        this.description = data.description || '';
        this.status = data.status || 'draft';
        this.beneficiaries = data.beneficiaries || [];
        this.multiSig = data.multiSig || {
            enabled: true,
            requiredConfirmations: 2,
            totalBeneficiaries: 0,
            currentConfirmations: 0,
        };
        this.deadManSwitch = data.deadManSwitch || {
            enabled: false,
            inactivityMonths: 6,
            lastCheckinAt: new Date(),
            nextDeadline: null,
            warningsSent: 0,
            isTriggered: false,
            triggeredAt: null,
        };
        this.notarization = data.notarization || {
            isNotarized: false,
            txHash: null,
            blockNumber: null,
            notarizedAt: null,
            contentHash: null,
        };
        this.legalTemplate = data.legalTemplate || { type: 'standard' };
        this.globalMemories = data.globalMemories || [];
        this.executedAt = data.executedAt || null;
        this.executionTxHash = data.executionTxHash || null;
        this.activityLog = data.activityLog || [];
        this.accessToken = data.accessToken || crypto.randomBytes(32).toString('hex');
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    static async find(query = {}) {
        const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        return items.filter(item => {
            for (let key in query) {
                if (query[key] && item[key] !== query[key]) return false;
            }
            return true;
        }).map(item => new DigitalWill(item));
    }

    static async findOne(query) {
        const items = await this.find(query);
        return items.length > 0 ? items[0] : null;
    }

    static async findById(id) {
        const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const item = items.find(i => i._id === id);
        return item ? new DigitalWill(item) : null;
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
            return new DigitalWill(deleted[0]);
        }
        return null;
    }

    async save() {
        const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        // Sync multi-sig and deadline logic
        if (this.beneficiaries) {
            this.multiSig.totalBeneficiaries = this.beneficiaries.length;
            this.multiSig.currentConfirmations = this.beneficiaries.filter(b => b.hasConfirmed).length;
        }
        if (this.deadManSwitch.enabled && this.deadManSwitch.lastCheckinAt) {
            const deadline = new Date(this.deadManSwitch.lastCheckinAt);
            deadline.setMonth(deadline.getMonth() + this.deadManSwitch.inactivityMonths);
            this.deadManSwitch.nextDeadline = deadline;
        }

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

    // Methods
    generateContentHash() {
        const content = JSON.stringify({
            title: this.title,
            description: this.description,
            beneficiaries: this.beneficiaries.map(b => ({
                name: b.name,
                email: b.email,
                walletAddress: b.walletAddress,
                assignedMemories: b.assignedMemories,
                assignedCategories: b.assignedCategories,
            })),
            multiSig: this.multiSig,
            deadManSwitch: {
                enabled: this.deadManSwitch.enabled,
                inactivityMonths: this.deadManSwitch.inactivityMonths,
            },
            createdAt: this.createdAt,
        });
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    async checkin() {
        this.deadManSwitch.lastCheckinAt = new Date();
        this.deadManSwitch.warningsSent = 0;
        this.deadManSwitch.isTriggered = false;
        this.activityLog.push({
            action: 'dead_man_switch_reset',
            details: 'Owner checked in',
            timestamp: new Date()
        });
        return this.save();
    }

    isUnlockable() {
        if (!this.multiSig.enabled) return true;
        return (this.multiSig.currentConfirmations || 0) >= (this.multiSig.requiredConfirmations || 1);
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

    // Sub-schema helper for beneficiaries.id()
    get beneficiary() {
        return {
            id: (bid) => this.beneficiaries.find(b => b._id === bid || b.id === bid)
        }
    }
}

// Setup static methods
DigitalWill.create = async (data) => {
    const will = new DigitalWill(data);
    await will.save();
    return will;
};

export default DigitalWill;
