import cron from 'node-cron';
import deadManSwitchDaemon from '../services/deadManSwitchDaemon.js';

/* ──────────────────────────────────────────────────────────────
   DEAD MAN'S SWITCH — CRON SCHEDULER

   Runs the Dead Man's Switch check every day at 2:00 AM.
   Cron expression: '0 2 * * *'
     ┌───── minute (0)
     │ ┌─── hour (2 AM)
     │ │ ┌─ day of month (every)
     │ │ │ ┌ month (every)
     │ │ │ │ ┌ day of week (every)
     0 2 * * *
   ────────────────────────────────────────────────────────────── */

let scheduledTask = null;

/**
 * Start the Dead Man's Switch cron job.
 * Should be called once during server startup.
 */
export function startDeadManSwitchCron() {
    if (scheduledTask) {
        console.warn('⚠️  Dead Man\'s Switch cron is already running.');
        return;
    }

    const cronExpression = process.env.DEAD_MAN_SWITCH_CRON || '0 2 * * *';

    scheduledTask = cron.schedule(cronExpression, async () => {
        try {
            await deadManSwitchDaemon.runCheck();
        } catch (error) {
            console.error('❌ Dead Man\'s Switch cron job failed:', error);
        }
    }, {
        timezone: process.env.TZ || 'Asia/Kolkata',
    });

    console.log(`⏰ Dead Man's Switch cron started — schedule: "${cronExpression}"`);
}

/**
 * Stop the cron job (useful for testing / graceful shutdown).
 */
export function stopDeadManSwitchCron() {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        console.log('🛑 Dead Man\'s Switch cron stopped.');
    }
}

/**
 * Manually trigger a check (useful for testing via API or CLI).
 */
export async function triggerManualCheck() {
    console.log('🔧 Manual Dead Man\'s Switch check triggered...');
    return await deadManSwitchDaemon.runCheck();
}

export default { startDeadManSwitchCron, stopDeadManSwitchCron, triggerManualCheck };
