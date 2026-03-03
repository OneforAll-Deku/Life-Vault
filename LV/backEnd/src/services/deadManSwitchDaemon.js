import DigitalWill from '../models/DigitalWill.js';
import User from '../models/User.js';
import willNotificationService from './willNotificationService.js';
import crypto from 'crypto';

/* ──────────────────────────────────────────────────────────────
   DEAD MAN'S SWITCH DAEMON
   
   Core monitoring logic that:
   1. Queries all active wills with dead man's switch enabled
   2. Calculates days remaining until deadline
   3. Sends staged warning emails (30d → 14d → 7d)
   4. Auto-executes wills when deadline passes
   ────────────────────────────────────────────────────────────── */

class DeadManSwitchDaemon {

    /**
     * Main check — called by the cron scheduler.
     * Iterates over every active will with the switch enabled
     * and takes appropriate action based on remaining time.
     */
    async runCheck() {
        const startTime = Date.now();
        console.log('\n🔍 ══════════════════════════════════════════════');
        console.log('   Dead Man\'s Switch Daemon — Starting scan...');
        console.log('   ' + new Date().toISOString());
        console.log('═══════════════════════════════════════════════\n');

        const stats = {
            totalScanned: 0,
            warningsSent: 0,
            willsExecuted: 0,
            errors: 0,
        };

        try {
            // ── Step 1: Find all wills that need monitoring ──
            const wills = await DigitalWill.find({
                status: 'active',
                'deadManSwitch.enabled': true,
                'deadManSwitch.isTriggered': false,
                'deadManSwitch.nextDeadline': { $ne: null },
            });

            stats.totalScanned = wills.length;
            console.log(`📋 Found ${wills.length} active will(s) with Dead Man's Switch enabled.\n`);

            if (wills.length === 0) {
                this._logSummary(stats, startTime);
                return stats;
            }

            // ── Step 2: Process each will ──
            for (const will of wills) {
                try {
                    await this._processWill(will, stats);
                } catch (error) {
                    stats.errors++;
                    console.error(`❌ Error processing will "${will.title}" (${will._id}):`, error.message);
                }
            }
        } catch (error) {
            stats.errors++;
            console.error('❌ Fatal daemon error:', error.message);
        }

        this._logSummary(stats, startTime);
        return stats;
    }

    /**
     * Process a single will — decide whether to warn or execute.
     */
    async _processWill(will, stats) {
        const now = new Date();
        const deadline = new Date(will.deadManSwitch.nextDeadline);
        const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);

        // Load the will owner
        const user = await User.findById(will.userId).select('name email');
        if (!user) {
            console.warn(`⚠️  Will "${will.title}" — owner not found, skipping.`);
            return;
        }

        console.log(`  📄 Will: "${will.title}" | Owner: ${user.email}`);
        console.log(`     Deadline: ${deadline.toISOString()} | Days left: ${daysLeft.toFixed(1)}`);
        console.log(`     Warnings sent: ${will.deadManSwitch.warningsSent}`);

        // ── CASE 1: Deadline has passed → Execute the will ──
        if (daysLeft <= 0) {
            console.log(`     🔴 DEADLINE PASSED — Executing will...`);
            await this._executeWill(will, user);
            stats.willsExecuted++;
            return;
        }

        // ── CASE 2: Within 7 days → Final warning ──
        if (daysLeft <= 7 && will.deadManSwitch.warningsSent < 3) {
            console.log(`     🚨 Sending FINAL warning (${daysLeft.toFixed(0)} days left)...`);
            await willNotificationService.sendWarningEmail(will, user, 'FINAL');
            will.deadManSwitch.warningsSent = 3;
            will.logActivity('confirmation_sent', null, `Final warning email sent — ${Math.ceil(daysLeft)} days remaining`);
            await will.save();
            stats.warningsSent++;
            return;
        }

        // ── CASE 3: Within 14 days → Urgent warning ──
        if (daysLeft <= 14 && will.deadManSwitch.warningsSent < 2) {
            console.log(`     ⚠️  Sending URGENT warning (${daysLeft.toFixed(0)} days left)...`);
            await willNotificationService.sendWarningEmail(will, user, 'URGENT');
            will.deadManSwitch.warningsSent = 2;
            will.logActivity('confirmation_sent', null, `Urgent warning email sent — ${Math.ceil(daysLeft)} days remaining`);
            await will.save();
            stats.warningsSent++;
            return;
        }

        // ── CASE 4: Within 30 days → Reminder ──
        if (daysLeft <= 30 && will.deadManSwitch.warningsSent < 1) {
            console.log(`     📧 Sending REMINDER (${daysLeft.toFixed(0)} days left)...`);
            await willNotificationService.sendWarningEmail(will, user, 'REMINDER');
            will.deadManSwitch.warningsSent = 1;
            will.logActivity('confirmation_sent', null, `Reminder email sent — ${Math.ceil(daysLeft)} days remaining`);
            await will.save();
            stats.warningsSent++;
            return;
        }

        // ── CASE 5: More than 30 days — no action needed ──
        console.log(`     ✅ All good — ${daysLeft.toFixed(0)} days remaining.\n`);
    }

    /**
     * Auto-execute a will when the dead man's switch triggers.
     * Sets status to 'executed', sends beneficiary emails,
     * and records a mock blockchain transaction hash.
     */
    async _executeWill(will, owner) {
        try {
            // Mark the switch as triggered
            will.deadManSwitch.isTriggered = true;
            will.deadManSwitch.triggeredAt = new Date();

            // Execute the will
            will.status = 'executed';
            will.executedAt = new Date();
            will.executionTxHash = '0x' + crypto.randomBytes(32).toString('hex');

            // Log the activity
            will.logActivity(
                'dead_man_switch_triggered',
                null,
                `Dead Man's Switch activated — will auto-executed after ${will.deadManSwitch.inactivityMonths} months of inactivity`,
                will.executionTxHash
            );

            will.logActivity(
                'will_executed',
                null,
                `Will executed automatically. Memories released to ${will.beneficiaries.length} beneficiaries.`
            );

            await will.save();

            console.log(`     ✅ Will executed. TX: ${will.executionTxHash.slice(0, 18)}...`);

            // Notify all beneficiaries
            const notificationResult = await willNotificationService.sendExecutionEmails(will);
            console.log(`     📧 Beneficiary notifications:`, JSON.stringify(notificationResult.results?.map(r => r.email) || []));

        } catch (error) {
            console.error(`     ❌ Execution failed for will "${will.title}":`, error.message);
            throw error;
        }
    }

    /**
     * Log a summary at the end of each scan.
     */
    _logSummary(stats, startTime) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('\n═══════════════════════════════════════════════');
        console.log('   Dead Man\'s Switch Daemon — Scan Complete');
        console.log(`   ⏱️  Duration: ${elapsed}s`);
        console.log(`   📋 Scanned:  ${stats.totalScanned} will(s)`);
        console.log(`   📧 Warnings: ${stats.warningsSent}`);
        console.log(`   🔴 Executed: ${stats.willsExecuted}`);
        console.log(`   ❌ Errors:   ${stats.errors}`);
        console.log('═══════════════════════════════════════════════\n');
    }
}

export default new DeadManSwitchDaemon();
