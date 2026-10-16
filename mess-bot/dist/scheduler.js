"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupScheduler = setupScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const config_js_1 = require("./config.js");
const pollManager_js_1 = require("./pollManager.js");
let isSchedulerRunning = false;
let currentSock = null;
let currentGetGroupJid = null;
function setupScheduler(sock, getGroupJid) {
    currentSock = sock;
    currentGetGroupJid = getGroupJid;
    if (isSchedulerRunning) {
        console.log('[Scheduler] Updated active WhatsApp socket for existing cron jobs.');
        return;
    }
    isSchedulerRunning = true;
    const timezone = config_js_1.CONFIG.TIMEZONE;
    console.log(`[Scheduler] Initializing cron scheduler with timezone: ${timezone}`);
    // 1. Midnight (12:00 AM / 00:00) -> Send Lunch Poll
    node_cron_1.default.schedule('0 0 * * *', async () => {
        const sock = currentSock;
        const groupJid = currentGetGroupJid?.();
        if (!sock || !groupJid) {
            console.warn('[Scheduler] Cannot send Lunch Poll: Socket or Group JID not ready');
            return;
        }
        console.log('[Scheduler] 12:00 AM: Triggering Lunch Poll...');
        await pollManager_js_1.pollManager.sendLunchPoll(sock, groupJid);
    }, { timezone });
    // 2. Morning 10:00 AM -> Lock Lunch Poll & Send Summary
    node_cron_1.default.schedule('0 10 * * *', async () => {
        const sock = currentSock;
        const groupJid = currentGetGroupJid?.();
        if (!sock || !groupJid)
            return;
        console.log('[Scheduler] 10:00 AM: Locking Lunch Poll...');
        await pollManager_js_1.pollManager.lockLunchPoll(sock, groupJid);
    }, { timezone });
    // 3. Noon 12:00 PM (12:00) -> Send Dinner Poll
    node_cron_1.default.schedule('0 12 * * *', async () => {
        const sock = currentSock;
        const groupJid = currentGetGroupJid?.();
        if (!sock || !groupJid) {
            console.warn('[Scheduler] Cannot send Dinner Poll: Socket or Group JID not ready');
            return;
        }
        console.log('[Scheduler] 12:00 PM: Triggering Dinner Poll...');
        await pollManager_js_1.pollManager.sendDinnerPoll(sock, groupJid);
    }, { timezone });
    // 4. Afternoon 03:00 PM (15:00) -> Lock Dinner Poll & Send Summary
    node_cron_1.default.schedule('0 15 * * *', async () => {
        const sock = currentSock;
        const groupJid = currentGetGroupJid?.();
        if (!sock || !groupJid)
            return;
        console.log('[Scheduler] 03:00 PM: Locking Dinner Poll...');
        await pollManager_js_1.pollManager.lockDinnerPoll(sock, groupJid);
    }, { timezone });
    console.log('[Scheduler] All 4 daily routines scheduled successfully:');
    console.log('  • 00:00 (12:00 AM) -> দুপুরের মিলের পোল যাবে');
    console.log('  • 10:00 (10:00 AM) -> দুপুরের মিল লক হবে');
    console.log('  • 12:00 (12:00 PM) -> রাতের মিলের পোল যাবে');
    console.log('  • 15:00 (03:00 PM) -> রাতের মিল লক হবে');
}
