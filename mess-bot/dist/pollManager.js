"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollManager = exports.PollManager = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const apiClient_js_1 = require("./apiClient.js");
const config_js_1 = require("./config.js");
const STATE_FILE = path_1.default.resolve(process.cwd(), 'active_polls.json');
class PollManager {
    activePolls = new Map();
    constructor() {
        this.loadState();
    }
    saveState() {
        try {
            const data = Array.from(this.activePolls.values());
            fs_1.default.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[PollManager] Error saving state:', err);
        }
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(STATE_FILE)) {
                const raw = fs_1.default.readFileSync(STATE_FILE, 'utf-8');
                const data = JSON.parse(raw);
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
        const options = ['0 টি (বন্ধ)', '1 টি', '2 টি'];
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
        const options = ['0 টি (বন্ধ)', '1 টি', '2 টি'];
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
    async lockLunchPoll(sock, groupJid) {
        const today = (0, config_js_1.getDhakaDate)();
        console.log(`[PollManager] Locking Lunch Poll for ${today}`);
        // Find today's lunch poll
        for (const poll of this.activePolls.values()) {
            if (poll.mealType === 'lunch' && poll.date === today) {
                poll.isLocked = true;
            }
        }
        this.saveState();
        // Fetch live summary from website
        const res = await apiClient_js_1.apiClient.getSummary(today, 'lunch', groupJid);
        if (res.success && res.summary) {
            const activeMembers = res.members?.filter((m) => m.lunch > 0) || [];
            const offMembers = res.members?.filter((m) => m.lunch === 0) || [];
            let activeText = '';
            if (activeMembers.length > 0) {
                activeText = '\n🟢 *যাদের মিল চালু আছে:*' + activeMembers.map((m) => `\n  • ${m.name}: ${m.lunch} টি`).join('');
            }
            else {
                activeText = '\n🟢 *যাদের মিল চালু আছে:* কেউ নেই';
            }
            let offText = '';
            if (offMembers.length > 0) {
                offText = '\n\n🔴 *যাদের মিল বন্ধ (০ টি):*' + offMembers.map((m) => `\n  • ${m.name}`).join('');
            }
            await sock.sendMessage(groupJid, {
                text: `🔒 *আজকের দুপুরের মিল লক করা হয়েছে!* (সকাল ১০:০০ টা)\n📊 *মোট দুপুরের মিল:* ${res.summary.totalLunch} টি\n${activeText}${offText}\n\n🌐 বিস্তারিত ওয়েবসাইটে লাইভ আপডেট হয়ে গেছে।`,
            });
        }
        else {
            await sock.sendMessage(groupJid, {
                text: `🔒 *আজকের দুপুরের মিল লক করা হয়েছে!* (সকাল ১০:০০ টা)\nএরপর আর কোনো ভোট গণনা করা হবে না।`,
            });
        }
    }
    async lockDinnerPoll(sock, groupJid) {
        const today = (0, config_js_1.getDhakaDate)();
        console.log(`[PollManager] Locking Dinner Poll for ${today}`);
        for (const poll of this.activePolls.values()) {
            if (poll.mealType === 'dinner' && poll.date === today) {
                poll.isLocked = true;
            }
        }
        this.saveState();
        // Fetch live summary from website
        const res = await apiClient_js_1.apiClient.getSummary(today, 'dinner', groupJid);
        if (res.success && res.summary) {
            const activeMembers = res.members?.filter((m) => m.dinner > 0) || [];
            const offMembers = res.members?.filter((m) => m.dinner === 0) || [];
            let activeText = '';
            if (activeMembers.length > 0) {
                activeText = '\n🟢 *যাদের মিল চালু আছে:*' + activeMembers.map((m) => `\n  • ${m.name}: ${m.dinner} টি`).join('');
            }
            else {
                activeText = '\n🟢 *যাদের মিল চালু আছে:* কেউ নেই';
            }
            let offText = '';
            if (offMembers.length > 0) {
                offText = '\n\n🔴 *যাদের মিল বন্ধ (০ টি):*' + offMembers.map((m) => `\n  • ${m.name}`).join('');
            }
            await sock.sendMessage(groupJid, {
                text: `🔒 *আজকের রাতের মিল লক করা হয়েছে!* (দুপুর ৩:০০ টা)\n📊 *মোট রাতের মিল:* ${res.summary.totalDinner} টি\n${activeText}${offText}\n\n🌐 বিস্তারিত ওয়েবসাইটে লাইভ আপডেট হয়ে গেছে।`,
            });
        }
        else {
            await sock.sendMessage(groupJid, {
                text: `🔒 *আজকের রাতের মিল লক করা হয়েছে!* (দুপুর ৩:০০ টা)\nএরপর আর কোনো ভোট গণনা করা হবে না।`,
            });
        }
    }
    async handlePollUpdate(sock, pollUpdate, senderJid) {
        try {
            const pollCreationKey = pollUpdate.pollCreationMessageKey;
            if (!pollCreationKey?.id)
                return;
            const activePoll = this.activePolls.get(pollCreationKey.id);
            if (!activePoll)
                return;
            // Add update to pollUpdates list
            activePoll.pollUpdates.push(pollUpdate);
            this.saveState();
            // Time check
            const { hour } = (0, config_js_1.getDhakaHourMinute)();
            if (activePoll.mealType === 'lunch' && (hour >= 10 || activePoll.isLocked)) {
                console.log(`[PollManager] Lunch poll is locked. Vote ignored from ${senderJid}`);
                return;
            }
            if (activePoll.mealType === 'dinner' && (hour >= 15 || activePoll.isLocked)) {
                console.log(`[PollManager] Dinner poll is locked. Vote ignored from ${senderJid}`);
                return;
            }
            // Aggregate votes
            const votes = (0, baileys_1.getAggregateVotesInPollMessage)({
                message: activePoll.message,
                pollUpdates: activePoll.pollUpdates,
            });
            // Extract voter phone number
            const voterPhone = senderJid.split('@')[0].split(':')[0];
            // Find the option selected by this voter
            let selectedCount = 0;
            for (const opt of votes) {
                const hasVotedThisOpt = opt.voters.some((v) => v.includes(voterPhone));
                if (hasVotedThisOpt) {
                    if (opt.name.includes('1'))
                        selectedCount = 1;
                    else if (opt.name.includes('2'))
                        selectedCount = 2;
                    else if (opt.name.includes('0'))
                        selectedCount = 0;
                    break;
                }
            }
            console.log(`[PollManager] Vote detected: ${voterPhone} -> ${activePoll.mealType} = ${selectedCount}`);
            // Send to Next.js API
            const res = await apiClient_js_1.apiClient.sendVote({
                phone: voterPhone,
                mealType: activePoll.mealType,
                count: selectedCount,
                date: activePoll.date,
                groupId: activePoll.key.remoteJid || undefined,
            });
            if (res.success && res.member) {
                console.log(`[PollManager] Vote recorded on website for: ${res.member.name}`);
                // React with thumbs up
                if (pollUpdate.pollCreationMessageKey) {
                    await sock.sendMessage(activePoll.key.remoteJid, {
                        react: {
                            text: '👍',
                            key: activePoll.key,
                        },
                    });
                }
            }
            else {
                console.warn(`[PollManager] Vote failed: ${res.error}`);
            }
        }
        catch (err) {
            console.error('[PollManager] Error handling poll update:', err);
        }
    }
}
exports.PollManager = PollManager;
exports.pollManager = new PollManager();
