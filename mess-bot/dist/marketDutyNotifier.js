"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDutyNotifier = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const apiClient_js_1 = require("./apiClient.js");
const config_js_1 = require("./config.js");
const BENGALI_MONTHS = {
    '01': 'জানুয়ারি',
    '02': 'ফেব্রুয়ারি',
    '03': 'মার্চ',
    '04': 'এপ্রিল',
    '05': 'মে',
    '06': 'জুন',
    '07': 'জুলাই',
    '08': 'আগস্ট',
    '09': 'সেপ্টেম্বর',
    '10': 'অক্টোবর',
    '11': 'নভেম্বর',
    '12': 'ডিসেম্বর',
};
const NOTIFIED_FILE = path_1.default.resolve(process.cwd(), 'market_duty_notified.json');
class MarketDutyNotifier {
    notifiedRecords = {};
    constructor() {
        this.loadState();
    }
    pruneOldRecords() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep only last 30 days
        const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
        for (const key of Object.keys(this.notifiedRecords)) {
            const record = this.notifiedRecords[key];
            if (record && record.date && record.date < cutoffDateStr) {
                delete this.notifiedRecords[key];
            }
        }
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(NOTIFIED_FILE)) {
                const raw = fs_1.default.readFileSync(NOTIFIED_FILE, 'utf-8');
                this.notifiedRecords = JSON.parse(raw);
                this.pruneOldRecords();
            }
        }
        catch (err) {
            console.warn('[MarketDutyNotifier] Error loading notified records, initializing empty store:', err);
            this.notifiedRecords = {};
        }
    }
    saveState() {
        try {
            this.pruneOldRecords();
            fs_1.default.writeFileSync(NOTIFIED_FILE, JSON.stringify(this.notifiedRecords, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[MarketDutyNotifier] Error saving notified records:', err);
        }
    }
    getRecordKey(groupId, dutyId, date) {
        return `${groupId}:${dutyId}:${date}`;
    }
    isDutyNotified(groupId, dutyId, date) {
        const key = this.getRecordKey(groupId, dutyId, date);
        return Boolean(this.notifiedRecords[key]);
    }
    markDutyNotified(groupId, dutyId, date, memberName) {
        const key = this.getRecordKey(groupId, dutyId, date);
        this.notifiedRecords[key] = {
            notifiedAt: new Date().toISOString(),
            groupId,
            dutyId,
            date,
            memberName,
        };
        this.saveState();
    }
    formatDateRange(startDay, endDay, monthKey, totalDays) {
        const [year, monthStr] = monthKey.split('-');
        const monthName = BENGALI_MONTHS[monthStr] || monthStr;
        if (startDay === endDay) {
            return `${startDay} ${monthName} ${year} (১ দিন)`;
        }
        return `${startDay} থেকে ${endDay} ${monthName} ${year} (${totalDays} দিন)`;
    }
    resolveMemberMention(member, participantIds) {
        const candidateLid = member.whatsappLid ? `${member.whatsappLid}@lid` : null;
        let candidatePhone = null;
        if (member.phone) {
            const digits = member.phone.replace(/\D/g, '');
            if (digits.length >= 10) {
                const fullPhone = digits.startsWith('0') ? '88' + digits : (digits.startsWith('88') ? digits : '880' + digits);
                candidatePhone = `${fullPhone}@s.whatsapp.net`;
            }
        }
        let primaryJid = null;
        if (participantIds) {
            if (candidateLid && participantIds.has(candidateLid)) {
                primaryJid = candidateLid;
            }
            else if (candidatePhone && participantIds.has(candidatePhone)) {
                primaryJid = candidatePhone;
            }
        }
        if (!primaryJid) {
            primaryJid = candidateLid || candidatePhone;
        }
        const mentionJids = [];
        if (candidateLid)
            mentionJids.push(candidateLid);
        if (candidatePhone && !mentionJids.includes(candidatePhone))
            mentionJids.push(candidatePhone);
        if (primaryJid) {
            const userTag = primaryJid.split('@')[0];
            return {
                mentionTag: `@${userTag}`,
                mentionJids,
                hasMention: true,
            };
        }
        return {
            mentionTag: `*${member.name}*`,
            mentionJids: [],
            hasMention: false,
        };
    }
    buildDutyStartMessage(duty, mentionTag, monthKey) {
        const dateRangeText = this.formatDateRange(duty.startDay, duty.endDay, monthKey, duty.totalDays);
        const lines = [
            `🛒 *মেসের বাজার ডিউটি রোস্টার ও ক্যালেন্ডার* 📅`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
            `🔔 *আগামীকাল থেকে নতুন বাজার ডিউটি শুরু!*`,
            ``,
            `সালাম ${mentionTag} (${duty.member.name}) ভাই,`,
            `আগামীকাল (${duty.startDay} তারিখ) থেকে আপনার মেসের বাজার ডিউটি শুরু হবে।`,
            ``,
            `📋 *বাজার সময়সূচি ও বিবরণ:*`,
            `──────────────────────`,
            `👤 *বাজারের দায়িত্বে:* ${mentionTag} (*${duty.member.name}*)`,
            `🗓️ *ডিউটি সময়কাল:* ${dateRangeText}`,
            `⏳ *মোট মেয়াদ:* ${duty.totalDays} দিন`,
            `📌 *স্ট্যাটাস:* আগামীকাল ১ম দিন (ডিউটি শুরু)`,
            duty.note ? `📝 *বাজার নোট:* ${duty.note}` : null,
            `──────────────────────`,
            ``,
            `💡 *বাজার সংক্রান্ত গুরুত্বপূর্ণ টিপস:*`,
            `• বাজারে যাওয়ার আগে মেসের মিল সংখ্যা ও মেম্বারদের পছন্দের ফর্দ দেখে নিন।`,
            `• কেনাকাটা শেষ করে মেস ম্যানেজমেন্ট সিস্টেমে সঠিক খরচের হিসাব এন্ট্রি দিন।`,
            ``,
            `মেসের সকল সদস্যের পক্ষ থেকে আপনার জন্য শুভকামনা! 🥦🐟🛍️✨`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
        ].filter((line) => line !== null);
        return lines.join('\n');
    }
    async checkAndNotifyMarketDuty(sock, groupJid, force = false) {
        const tomorrow = (0, config_js_1.getDhakaDate)(1);
        const errors = [];
        let notifiedCount = 0;
        try {
            console.log(`[MarketDutyNotifier] Checking tomorrow's market duties for ${groupJid} on date: ${tomorrow}`);
            const res = await apiClient_js_1.apiClient.getMarketDuties(groupJid, tomorrow);
            if (!res.success) {
                console.warn(`[MarketDutyNotifier] Could not fetch market duties for ${groupJid}: ${res.error}`);
                return { notifiedCount: 0, errors: [res.error || 'Fetch failed'] };
            }
            const startingDuties = res.startingDuties || [];
            if (!startingDuties.length) {
                console.log(`[MarketDutyNotifier] No market duty starting tomorrow (${tomorrow}) for ${groupJid}`);
                return { notifiedCount: 0, errors: [] };
            }
            let participantIds;
            try {
                const meta = await sock.groupMetadata(groupJid);
                participantIds = new Set(meta.participants.map((p) => p.id));
            }
            catch (metaErr) {
                console.warn(`[MarketDutyNotifier] Could not load group participants for ${groupJid}:`, metaErr);
            }
            for (const duty of startingDuties) {
                const alreadyNotified = this.isDutyNotified(groupJid, duty.id, tomorrow);
                if (alreadyNotified && !force) {
                    console.log(`[MarketDutyNotifier] Duty ${duty.id} (${duty.member.name}) was already notified for ${tomorrow}. Skipping.`);
                    continue;
                }
                const { mentionTag, mentionJids } = this.resolveMemberMention(duty.member, participantIds);
                const messageText = this.buildDutyStartMessage(duty, mentionTag, res.monthKey || tomorrow.slice(0, 7));
                try {
                    await sock.sendMessage(groupJid, {
                        text: messageText,
                        mentions: mentionJids,
                    });
                    this.markDutyNotified(groupJid, duty.id, tomorrow, duty.member.name);
                    notifiedCount++;
                    console.log(`[MarketDutyNotifier] ✅ Sent advance market duty notification for ${duty.member.name} to ${groupJid}`);
                }
                catch (sendErr) {
                    console.error(`[MarketDutyNotifier] Failed to send notification for ${duty.member.name}:`, sendErr);
                    errors.push(sendErr?.message || String(sendErr));
                }
            }
        }
        catch (err) {
            console.error(`[MarketDutyNotifier] Unexpected error for ${groupJid}:`, err);
            errors.push(err?.message || String(err));
        }
        return { notifiedCount, errors };
    }
    async getActiveDutySummaryText(sock, groupJid) {
        const today = (0, config_js_1.getDhakaDate)();
        const res = await apiClient_js_1.apiClient.getMarketDuties(groupJid, today);
        if (!res.success) {
            return {
                text: `❌ বাজার ডিউটির তথ্য পাওয়া যায়নি: ${res.error || 'অজানা সমস্যা'}`,
                mentions: [],
            };
        }
        const activeDuties = res.activeDuties || [];
        const day = res.day || parseInt(today.slice(8, 10), 10);
        const monthKey = res.monthKey || today.slice(0, 7);
        const [year, monthStr] = monthKey.split('-');
        const monthName = BENGALI_MONTHS[monthStr] || monthStr;
        if (!activeDuties.length) {
            return {
                text: `📋 *আজকের বাজার ডিউটি তথ্য (${today}):*\n\nআজ (${day} ${monthName}) কারো বাজার ডিউটি নির্ধারিত নেই।\nওয়েবসাইটের "বাজার সময়সূচি" পেজ থেকে মেম্বারদের ডিউটি নির্ধারণ করুন।`,
                mentions: [],
            };
        }
        let participantIds;
        try {
            const meta = await sock.groupMetadata(groupJid);
            participantIds = new Set(meta.participants.map((p) => p.id));
        }
        catch { }
        const allMentions = [];
        const dutyCards = activeDuties.map((duty) => {
            const { mentionTag, mentionJids } = this.resolveMemberMention(duty.member, participantIds);
            for (const jid of mentionJids) {
                if (!allMentions.includes(jid))
                    allMentions.push(jid);
            }
            const dateRange = this.formatDateRange(duty.startDay, duty.endDay, monthKey, duty.totalDays);
            return [
                `👤 *বাজারের দায়িত্বে:* ${mentionTag} (*${duty.member.name}*)`,
                `🗓️ *সময়কাল:* ${dateRange}`,
                `⏳ *অবশিষ্ট দিন:* আজসহ আর ${duty.daysRemaining} দিন বাকি`,
                duty.note ? `📝 *নোট:* ${duty.note}` : null,
            ].filter(Boolean).join('\n');
        });
        const text = [
            `🛒 *আজকের বাজার ডিউটি স্পটলাইট (${today})* 📅`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
            ...dutyCards,
            `━━━━━━━━━━━━━━━━━━━━━━`,
        ].join('\n');
        return { text, mentions: allMentions };
    }
    async sendTestPreview(sock, groupJid) {
        const tomorrow = (0, config_js_1.getDhakaDate)(1);
        const res = await apiClient_js_1.apiClient.getMarketDuties(groupJid, tomorrow);
        if (!res.success) {
            await sock.sendMessage(groupJid, { text: `❌ বাজার ডেটা লোড করা যায়নি: ${res.error}` });
            return false;
        }
        const duty = (res.startingDuties && res.startingDuties[0]) ||
            (res.activeDuties && res.activeDuties[0]) ||
            (res.allDuties && res.allDuties[0]);
        if (!duty) {
            await sock.sendMessage(groupJid, {
                text: `ℹ️ এই মাসে মেসের বাজার সময়সূচিতে কোনো এন্ট্রি নেই। ওয়েবসাইটের "বাজার সময়সূচি" থেকে ডিউটি সেট করুন।`,
            });
            return false;
        }
        let participantIds;
        try {
            const meta = await sock.groupMetadata(groupJid);
            participantIds = new Set(meta.participants.map((p) => p.id));
        }
        catch { }
        const { mentionTag, mentionJids } = this.resolveMemberMention(duty.member, participantIds);
        const previewMessage = `🧪 *[টেস্ট প্রিভিউ - বাজার ডিউটি নোটিশ]*\n\n` +
            this.buildDutyStartMessage(duty, mentionTag, res.monthKey || tomorrow.slice(0, 7));
        await sock.sendMessage(groupJid, {
            text: previewMessage,
            mentions: mentionJids,
        });
        return true;
    }
}
exports.marketDutyNotifier = new MarketDutyNotifier();
