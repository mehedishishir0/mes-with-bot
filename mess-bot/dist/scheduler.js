"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pauseScheduler = pauseScheduler;
exports.setupScheduler = setupScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const config_js_1 = require("./config.js");
const pollManager_js_1 = require("./pollManager.js");
let isSchedulerRunning = false;
let currentSock = null;
let currentGetGroupJids = null;
function pauseScheduler() {
    currentSock = null;
}
function setupScheduler(sock, getGroupJids) {
    currentSock = sock;
    currentGetGroupJids = getGroupJids;
    if (isSchedulerRunning) {
        console.log('[Scheduler] Updated active WhatsApp socket for existing cron jobs.');
        return;
    }
    isSchedulerRunning = true;
    const timezone = config_js_1.CONFIG.TIMEZONE;
    console.log(`[Scheduler] Initializing cron scheduler with timezone: ${timezone}`);
    const runForGroups = async (taskName, action) => {
        const sock = currentSock;
        if (!sock)
            return;
        const groupJids = await currentGetGroupJids?.() || [];
        if (!groupJids.length) {
            console.warn(`[Scheduler] ${taskName}: no connected mess groups found`);
            return;
        }
        for (const groupJid of groupJids) {
            try {
                await action(sock, groupJid);
            }
            catch (error) {
                console.error(`[Scheduler] ${taskName} failed for ${groupJid}:`, error);
            }
        }
    };
    // 00:10 -> Send Lunch Poll
    node_cron_1.default.schedule('10 0 * * *', async () => {
        console.log('[Scheduler] 12:10 AM: Triggering Lunch Poll...');
        await runForGroups('Lunch poll', async (socket, groupJid) => pollManager_js_1.pollManager.sendLunchPoll(socket, groupJid));
    }, { timezone });
    // 09:45 -> Remind members before the lunch cutoff
    node_cron_1.default.schedule('45 9 * * *', async () => {
        await runForGroups('Lunch warning', async (socket, groupJid) => pollManager_js_1.pollManager.sendClosingWarning(socket, groupJid, 'lunch'));
    }, { timezone });
    // 2. Morning 10:00 AM -> Lock Lunch Poll & Send Summary
    node_cron_1.default.schedule('0 10 * * *', async () => {
        console.log('[Scheduler] 10:00 AM: Locking Lunch Poll...');
        await runForGroups('Lunch lock', async (socket, groupJid) => pollManager_js_1.pollManager.lockLunchPoll(socket, groupJid));
    }, { timezone });
    // 11:00 -> Send Dinner Poll
    node_cron_1.default.schedule('0 11 * * *', async () => {
        console.log('[Scheduler] 11:00 AM: Triggering Dinner Poll...');
        await runForGroups('Dinner poll', async (socket, groupJid) => pollManager_js_1.pollManager.sendDinnerPoll(socket, groupJid));
    }, { timezone });
    // 14:45 -> Remind members before the dinner cutoff
    node_cron_1.default.schedule('45 14 * * *', async () => {
        await runForGroups('Dinner warning', async (socket, groupJid) => pollManager_js_1.pollManager.sendClosingWarning(socket, groupJid, 'dinner'));
    }, { timezone });
    // 4. Afternoon 03:00 PM (15:00) -> Lock Dinner Poll & Send Summary
    node_cron_1.default.schedule('0 15 * * *', async () => {
        console.log('[Scheduler] 03:00 PM: Locking Dinner Poll...');
        await runForGroups('Dinner lock', async (socket, groupJid) => pollManager_js_1.pollManager.lockDinnerPoll(socket, groupJid));
    }, { timezone });
    console.log('[Scheduler] All 6 daily routines scheduled successfully:');
    console.log('  • 00:10 (12:10 AM) -> দুপুরের মিলের পোল যাবে');
    console.log('  • 09:45 (09:45 AM) -> দুপুরের ভোটের সতর্কবার্তা যাবে');
    console.log('  • 10:00 (10:00 AM) -> দুপুরের মিল লক হবে');
    console.log('  • 11:00 (11:00 AM) -> রাতের মিলের পোল যাবে');
    console.log('  • 14:45 (02:45 PM) -> রাতের ভোটের সতর্কবার্তা যাবে');
    console.log('  • 15:00 (03:00 PM) -> রাতের মিল লক হবে');
}
