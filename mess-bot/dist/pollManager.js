"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollManager = exports.PollManager = void 0;
exports.revivePollBuffer = revivePollBuffer;
const baileys_1 = require("@whiskeysockets/baileys");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const apiClient_js_1 = require("./apiClient.js");
const config_js_1 = require("./config.js");
const pollVote_js_1 = require("./pollVote.js");
function revivePollBuffer(key, value) {
    if (key === 'messageSecret' && typeof value === 'string') {
        return Buffer.from(value, 'base64');
    }
    const restored = baileys_1.BufferJSON.reviver(key, value);
    if (restored !== value || !value || typeof value !== 'object' || Array.isArray(value))
        return restored;
    // Older active_polls.json files serialized Uint8Array as {"0": n, "1": n, ...}.
    const bytes = Object.entries(value);
    if (bytes.length && bytes.every(([index, byte], position) => index === String(position) && Number.isInteger(byte) && Number(byte) >= 0 && Number(byte) <= 255)) {
        return Buffer.from(bytes.map(([, byte]) => Number(byte)));
    }
    return value;
}
const STATE_FILE = path_1.default.resolve(process.cwd(), 'active_polls.json');
class PollManager {
    activePolls = new Map();
    constructor() {
        this.loadState();
    }
    saveState() {
        try {
            const data = Array.from(this.activePolls.values());
            fs_1.default.writeFileSync(STATE_FILE, JSON.stringify(data, baileys_1.BufferJSON.replacer, 2), 'utf-8');
        }
        catch (err) {
            console.error('[PollManager] Error saving state:', err);
        }
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(STATE_FILE)) {
                const raw = fs_1.default.readFileSync(STATE_FILE, 'utf-8');
                const data = JSON.parse(raw, revivePollBuffer);
                const today = (0, config_js_1.getDhakaDate)();
                // Only keep polls from today
                for (const poll of data) {
                    if (poll.date === today) {
                        this.activePolls.set(poll.id, poll);
                    }
                }
            }
        }
        catch (err) {
            console.error('[PollManager] Error loading state:', err);
        }
    }
    async sendLunchPoll(sock, groupJid) {
        const today = (0, config_js_1.getDhakaDate)();
        console.log(`[PollManager] Sending Lunch Poll for date: ${today} to ${groupJid}`);
        const question = `🍛 আজকের দুপুরের মিল (Lunch) কয়টি? [${today}]`;
        const options = ['0 টি (বন্ধ)', '1 টি', '2 টি', '3 টি', '4 টি', '5 টি', '6 টি'];
        const msg = await sock.sendMessage(groupJid, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1,
            },
        });
        if (!msg || !msg.key.id)
            return;
        const pollCreation = msg.message?.pollCreationMessage || msg.message?.pollCreationMessageV3;
        if (!pollCreation)
            return;
        const activePoll = {
            id: msg.key.id,
            key: msg.key,
            message: msg.message,
            pollCreation,
            pollUpdates: [],
            mealType: 'lunch',
            date: today,
            isLocked: false,
        };
        this.activePolls.set(msg.key.id, activePoll);
        this.saveState();
        // Send notice
        await sock.sendMessage(groupJid, {
            text: `⏰ *ভোট দেওয়ার সময়:* সকাল ১০:০০ টা পর্যন্ত।\n⚠️ সকাল ১০:০০ টার পর দুপুরের মিল লক হয়ে যাবে এবং আর পরিবর্তন করা যাবে না। যারা ভোট দিবেন না তাদের মিল স্বয়ংক্রিয়ভাবে ০ থাকবে।`,
        });
    }
    async sendDinnerPoll(sock, groupJid) {
        const today = (0, config_js_1.getDhakaDate)();
        console.log(`[PollManager] Sending Dinner Poll for date: ${today} to ${groupJid}`);
        const question = `🌙 আজকের রাতের মিল (Dinner) কয়টি? [${today}]`;
        const options = ['0 টি (বন্ধ)', '1 টি', '2 টি', '3 টি', '4 টি', '5 টি', '6 টি'];
        const msg = await sock.sendMessage(groupJid, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1,
            },
        });
        if (!msg || !msg.key.id)
            return;
        const pollCreation = msg.message?.pollCreationMessage || msg.message?.pollCreationMessageV3;
        if (!pollCreation)
            return;
        const activePoll = {
            id: msg.key.id,
            key: msg.key,
            message: msg.message,
            pollCreation,
            pollUpdates: [],
            mealType: 'dinner',
            date: today,
            isLocked: false,
        };
        this.activePolls.set(msg.key.id, activePoll);
        this.saveState();
        // Send notice
        await sock.sendMessage(groupJid, {
            text: `⏰ *ভোট দেওয়ার সময়:* দুপুর ৩:০০ টা পর্যন্ত।\n⚠️ দুপুর ৩:০০ টার পর রাতের মিল লক হয়ে যাবে এবং আর পরিবর্তন করা যাবে না। যারা ভোট দিবেন না তাদের মিল স্বয়ংক্রিয়ভাবে ০ থাকবে।`,
        });
    }
    async sendClosingWarning(sock, groupJid, mealType) {
        const label = mealType === 'lunch' ? 'দুপুরের' : 'রাতের';
        const cutoff = mealType === 'lunch' ? 'সকাল ১০:০০' : 'দুপুর ৩:০০';
        await sock.sendMessage(groupJid, {
            text: `⚠️ *${label} মিলের ভোট বন্ধ হতে আর ১৫ মিনিট বাকি!*\nযাঁরা এখনো ভোট দেননি, দ্রুত ভোট দিন। ${cutoff} টায় ভোট লক হবে। ভোট না দিলে মিল ০ ধরা হবে।`,
        });
    }
    async lockLunchPoll(sock, groupJid) {
        await this.lockPoll(sock, groupJid, 'lunch');
    }
    async lockDinnerPoll(sock, groupJid) {
        await this.lockPoll(sock, groupJid, 'dinner');
    }
    async lockPoll(sock, groupJid, mealType) {
        const today = (0, config_js_1.getDhakaDate)();
        const label = mealType === 'lunch' ? 'দুপুরের' : 'রাতের';
        const cutoff = mealType === 'lunch' ? 'সকাল ১০:০০' : 'দুপুর ৩:০০';
        console.log(`[PollManager] Locking ${mealType} poll for ${today}`);
        for (const poll of this.activePolls.values()) {
            if (poll.mealType === mealType && poll.date === today) {
                poll.isLocked = true;
            }
        }
        this.saveState();
        await sock.sendMessage(groupJid, {
            text: `🔒 *আজকের ${label} মিলের ভোট লক করা হয়েছে!* (${cutoff} টা)\nএখন থেকে আর কোনো ভোট গণনা করা হবে না।`,
        });
        const res = await apiClient_js_1.apiClient.getSummary(today, mealType, groupJid);
        if (res.success && res.summary) {
            const mealCount = (member) => mealType === 'lunch' ? member.lunch : member.dinner;
            const activeMembers = res.members?.filter((member) => mealCount(member) > 0) || [];
            const offMembers = res.members?.filter((member) => mealCount(member) === 0) || [];
            const activeText = activeMembers.length
                ? activeMembers.map((member) => `\n  • ${member.name}: ${mealCount(member)} টি`).join('')
                : '\n  • কেউ নেই';
            const offText = offMembers.length
                ? offMembers.map((member) => `\n  • ${member.name}`).join('')
                : '\n  • কেউ নেই';
            const total = mealType === 'lunch' ? res.summary.totalLunch : res.summary.totalDinner;
            await sock.sendMessage(groupJid, {
                text: `📊 *আজকের ${label} মিলের সারাংশ (${today})*\n🟢 *মিল চালু:*${activeText}\n\n🔴 *মিল বন্ধ / ভোট দেননি (০ টি):*${offText}\n\n*মোট ${label} মিল: ${total} টি*`,
            });
        }
        else {
            console.warn(`[PollManager] Could not fetch ${mealType} summary: ${res.error}`);
        }
    }
    async notifyLateVote(sock, poll, voterJid, knownName) {
        if (poll.lateNotifiedVoters?.includes(voterJid))
            return;
        const member = knownName ? null : await apiClient_js_1.apiClient.getMember(voterJid, poll.key.remoteJid || '');
        const name = knownName || (member?.success && member.memberName) || 'সদস্য';
        const label = poll.mealType === 'lunch' ? 'দুপুরের' : 'রাতের';
        await sock.sendMessage(poll.key.remoteJid, {
            text: `🔒 ${name}, আজকের ${label} মিলের ভোট এই মুহূর্তে লক করা হয়েছে। আপনার নতুন ভোট গণনা করা হয়নি।`,
        });
        poll.lateNotifiedVoters = [...(poll.lateNotifiedVoters || []), voterJid];
        this.saveState();
    }
    async handlePollUpdate(sock, pollId, pollUpdate) {
        try {
            const activePoll = this.activePolls.get(pollId);
            if (!activePoll)
                return;
            const voterJid = pollUpdate.pollUpdateMessageKey?.participant;
            if (!voterJid || !pollUpdate.vote)
                return;
            if (activePoll.date !== (0, config_js_1.getDhakaDate)())
                return;
            // Time check
            const { hour } = (0, config_js_1.getDhakaHourMinute)();
            const isClosed = activePoll.isLocked || (activePoll.mealType === 'lunch' ? hour >= 10 : hour >= 15);
            if (isClosed) {
                console.log(`[PollManager] ${activePoll.mealType} poll is locked. Vote ignored from ${voterJid}`);
                await this.notifyLateVote(sock, activePoll, voterJid);
                return;
            }
            // The selected options in messages.update are decrypted SHA-256 hashes.
            // An empty selection means the voter removed their vote (0 meals).
            const selectedCount = (0, pollVote_js_1.selectedMealCount)(activePoll.pollCreation, pollUpdate.vote);
            if (selectedCount === null) {
                console.warn(`[PollManager] Unknown poll selection from ${voterJid}; vote ignored`);
                return;
            }
            console.log(`[PollManager] Vote detected: ${voterJid} -> ${activePoll.mealType} = ${selectedCount}`);
            // Send to Next.js API
            const res = await apiClient_js_1.apiClient.sendVote({
                voterJid,
                mealType: activePoll.mealType,
                count: selectedCount,
                date: activePoll.date,
                groupId: activePoll.key.remoteJid || undefined,
            });
            if (res.success && res.member) {
                activePoll.pollUpdates = activePoll.pollUpdates.filter((previous) => previous.pollUpdateMessageKey?.participant !== voterJid);
                activePoll.pollUpdates.push(pollUpdate);
                this.saveState();
                console.log(`[PollManager] Vote recorded on website for: ${res.member.name}`);
                // React with thumbs up
                try {
                    await sock.sendMessage(activePoll.key.remoteJid, {
                        react: {
                            text: '👍',
                            key: activePoll.key,
                        },
                    });
                }
                catch (err) {
                    console.warn('[PollManager] Vote saved, but reaction failed:', err);
                }
            }
            else {
                console.warn(`[PollManager] Vote failed: ${res.error}`);
                if (res.locked)
                    await this.notifyLateVote(sock, activePoll, voterJid, res.memberName);
            }
        }
        catch (err) {
            console.error('[PollManager] Error handling poll update:', err);
        }
    }
}
exports.PollManager = PollManager;
exports.pollManager = new PollManager();
