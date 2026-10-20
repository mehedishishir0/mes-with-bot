import type { WASocket } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import { apiClient, type MarketDutyItem, type MarketDutyMember } from './apiClient.js'
import { getDhakaDate } from './config.js'

const BENGALI_MONTHS: Record<string, string> = {
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
}

const NOTIFIED_FILE = path.resolve(process.cwd(), 'market_duty_notified.json')

type NotifiedStore = {
  [recordKey: string]: {
    notifiedAt: string
    groupId: string
    dutyId: string
    date: string
    memberName: string
  }
}

class MarketDutyNotifier {
  private notifiedRecords: NotifiedStore = {}

  constructor() {
    this.loadState()
  }

  private pruneOldRecords() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // Keep only last 30 days
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10)

    for (const key of Object.keys(this.notifiedRecords)) {
      const record = this.notifiedRecords[key]
      if (record && record.date && record.date < cutoffDateStr) {
        delete this.notifiedRecords[key]
      }
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(NOTIFIED_FILE)) {
        const raw = fs.readFileSync(NOTIFIED_FILE, 'utf-8')
        this.notifiedRecords = JSON.parse(raw)
        this.pruneOldRecords()
      }
    } catch (err) {
      console.warn('[MarketDutyNotifier] Error loading notified records, initializing empty store:', err)
      this.notifiedRecords = {}
    }
  }

  private saveState() {
    try {
      this.pruneOldRecords()
      fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(this.notifiedRecords, null, 2), 'utf-8')
    } catch (err) {
      console.error('[MarketDutyNotifier] Error saving notified records:', err)
    }
  }

  private getRecordKey(groupId: string, dutyId: string, date: string): string {
    return `${groupId}:${dutyId}:${date}`
  }

  isDutyNotified(groupId: string, dutyId: string, date: string): boolean {
    const key = this.getRecordKey(groupId, dutyId, date)
    return Boolean(this.notifiedRecords[key])
  }

  markDutyNotified(groupId: string, dutyId: string, date: string, memberName: string) {
    const key = this.getRecordKey(groupId, dutyId, date)
    this.notifiedRecords[key] = {
      notifiedAt: new Date().toISOString(),
      groupId,
      dutyId,
      date,
      memberName,
    }
    this.saveState()
  }

  formatDateRange(startDay: number, endDay: number, monthKey: string, totalDays: number): string {
    const [year, monthStr] = monthKey.split('-')
    const monthName = BENGALI_MONTHS[monthStr] || monthStr
    if (startDay === endDay) {
      return `${startDay} ${monthName} ${year} (১ দিন)`
    }
    return `${startDay} থেকে ${endDay} ${monthName} ${year} (${totalDays} দিন)`
  }

  resolveMemberMention(
    member: MarketDutyMember,
    participantIds?: Set<string>
  ): { mentionTag: string; mentionJids: string[]; hasMention: boolean } {
    const candidateLid = member.whatsappLid ? `${member.whatsappLid}@lid` : null

    let candidatePhone: string | null = null
    if (member.phone) {
      const digits = member.phone.replace(/\D/g, '')
      if (digits.length >= 10) {
        const fullPhone = digits.startsWith('0') ? '88' + digits : (digits.startsWith('88') ? digits : '880' + digits)
        candidatePhone = `${fullPhone}@s.whatsapp.net`
      }
    }

    let primaryJid: string | null = null
    if (participantIds) {
      if (candidateLid && participantIds.has(candidateLid)) {
        primaryJid = candidateLid
      } else if (candidatePhone && participantIds.has(candidatePhone)) {
        primaryJid = candidatePhone
      }
    }

    if (!primaryJid) {
      primaryJid = candidateLid || candidatePhone
    }

    const mentionJids: string[] = []
    if (candidateLid) mentionJids.push(candidateLid)
    if (candidatePhone && !mentionJids.includes(candidatePhone)) mentionJids.push(candidatePhone)

    if (primaryJid) {
      const userTag = primaryJid.split('@')[0]
      return {
        mentionTag: `@${userTag}`,
        mentionJids,
        hasMention: true,
      }
    }

    return {
      mentionTag: `*${member.name}*`,
      mentionJids: [],
      hasMention: false,
    }
  }

  buildDutyStartMessage(
    duty: MarketDutyItem,
    mentionTag: string,
    monthKey: string
  ): string {
    const dateRangeText = this.formatDateRange(duty.startDay, duty.endDay, monthKey, duty.totalDays)

    const lines = [
      `🛒 *মেসের বাজার ডিউটি রোস্টার ও ক্যালেন্ডার* 📅`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🔔 *আজ থেকে নতুন বাজার ডিউটি শুরু!*`,
      ``,
      `সালাম ${mentionTag} (${duty.member.name}) ভাই,`,
      `আজ (${duty.startDay} তারিখ) থেকে আপনার মেসের বাজার ডিউটি শুরু হয়েছে।`,
      ``,
      `📋 *বাজার সময়সূচি ও বিবরণ:*`,
      `──────────────────────`,
      `👤 *বাজারের দায়িত্বে:* ${mentionTag} (*${duty.member.name}*)`,
      `🗓️ *ডিউটি সময়কাল:* ${dateRangeText}`,
      `⏳ *মোট মেয়াদ:* ${duty.totalDays} দিন`,
      `📌 *স্ট্যাটাস:* আজ ১ম দিন (ডিউটি শুরু)`,
      duty.note ? `📝 *বাজার নোট:* ${duty.note}` : null,
      `──────────────────────`,
      ``,
      `💡 *বাজার সংক্রান্ত গুরুত্বপূর্ণ টিপস:*`,
      `• বাজারে যাওয়ার আগে মেসের মিল সংখ্যা ও মেম্বারদের পছন্দের ফর্দ দেখে নিন।`,
      `• কেনাকাটা শেষ করে মেস ম্যানেজমেন্ট সিস্টেমে সঠিক খরচের হিসাব এন্ট্রি দিন।`,
      ``,
      `মেসের সকল সদস্যের পক্ষ থেকে আপনার জন্য শুভকামনা! 🥦🐟🛍️✨`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
    ].filter((line): line is string => line !== null)

    return lines.join('\n')
  }

  async checkAndNotifyMarketDuty(
    sock: WASocket,
    groupJid: string,
    force = false
  ): Promise<{ notifiedCount: number; errors: string[] }> {
    const today = getDhakaDate()
    const errors: string[] = []
    let notifiedCount = 0

    try {
      console.log(`[MarketDutyNotifier] Checking market duties for ${groupJid} on date: ${today}`)
      const res = await apiClient.getMarketDuties(groupJid, today)

      if (!res.success) {
        console.warn(`[MarketDutyNotifier] Could not fetch market duties for ${groupJid}: ${res.error}`)
        return { notifiedCount: 0, errors: [res.error || 'Fetch failed'] }
      }

      const startingDuties = res.startingDuties || []
      if (!startingDuties.length) {
        console.log(`[MarketDutyNotifier] No market duty starting today (${today}) for ${groupJid}`)
        return { notifiedCount: 0, errors: [] }
      }

      let participantIds: Set<string> | undefined
      try {
        const meta = await sock.groupMetadata(groupJid)
        participantIds = new Set(meta.participants.map((p) => p.id))
      } catch (metaErr) {
        console.warn(`[MarketDutyNotifier] Could not load group participants for ${groupJid}:`, metaErr)
      }

      for (const duty of startingDuties) {
        const alreadyNotified = this.isDutyNotified(groupJid, duty.id, today)
        if (alreadyNotified && !force) {
          console.log(`[MarketDutyNotifier] Duty ${duty.id} (${duty.member.name}) was already notified for ${today}. Skipping.`)
          continue
        }

        const { mentionTag, mentionJids } = this.resolveMemberMention(duty.member, participantIds)
        const messageText = this.buildDutyStartMessage(duty, mentionTag, res.monthKey || today.slice(0, 7))

        try {
          await sock.sendMessage(groupJid, {
            text: messageText,
            mentions: mentionJids,
          })
          this.markDutyNotified(groupJid, duty.id, today, duty.member.name)
          notifiedCount++
          console.log(`[MarketDutyNotifier] ✅ Sent market duty start notification for ${duty.member.name} to ${groupJid}`)
        } catch (sendErr: any) {
          console.error(`[MarketDutyNotifier] Failed to send notification for ${duty.member.name}:`, sendErr)
          errors.push(sendErr?.message || String(sendErr))
        }
      }
    } catch (err: any) {
      console.error(`[MarketDutyNotifier] Unexpected error for ${groupJid}:`, err)
      errors.push(err?.message || String(err))
    }

    return { notifiedCount, errors }
  }

  async getActiveDutySummaryText(
    sock: WASocket,
    groupJid: string
  ): Promise<{ text: string; mentions: string[] }> {
    const today = getDhakaDate()
    const res = await apiClient.getMarketDuties(groupJid, today)

    if (!res.success) {
      return {
        text: `❌ বাজার ডিউটির তথ্য পাওয়া যায়নি: ${res.error || 'অজানা সমস্যা'}`,
        mentions: [],
      }
    }

    const activeDuties = res.activeDuties || []
    const day = res.day || parseInt(today.slice(8, 10), 10)
    const monthKey = res.monthKey || today.slice(0, 7)
    const [year, monthStr] = monthKey.split('-')
    const monthName = BENGALI_MONTHS[monthStr] || monthStr

    if (!activeDuties.length) {
      return {
        text: `📋 *আজকের বাজার ডিউটি তথ্য (${today}):*\n\nআজ (${day} ${monthName}) কারো বাজার ডিউটি নির্ধারিত নেই।\nওয়েবসাইটের "বাজার সময়সূচি" পেজ থেকে মেম্বারদের ডিউটি নির্ধারণ করুন।`,
        mentions: [],
      }
    }

    let participantIds: Set<string> | undefined
    try {
      const meta = await sock.groupMetadata(groupJid)
      participantIds = new Set(meta.participants.map((p) => p.id))
    } catch {}

    const allMentions: string[] = []
    const dutyCards = activeDuties.map((duty) => {
      const { mentionTag, mentionJids } = this.resolveMemberMention(duty.member, participantIds)
      for (const jid of mentionJids) {
        if (!allMentions.includes(jid)) allMentions.push(jid)
      }
      const dateRange = this.formatDateRange(duty.startDay, duty.endDay, monthKey, duty.totalDays)
      return [
        `👤 *বাজারের দায়িত্বে:* ${mentionTag} (*${duty.member.name}*)`,
        `🗓️ *সময়কাল:* ${dateRange}`,
        `⏳ *অবশিষ্ট দিন:* আজসহ আর ${duty.daysRemaining} দিন বাকি`,
        duty.note ? `📝 *নোট:* ${duty.note}` : null,
      ].filter(Boolean).join('\n')
    })

    const text = [
      `🛒 *আজকের বাজার ডিউটি স্পটলাইট (${today})* 📅`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ...dutyCards,
      `━━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n')

    return { text, mentions: allMentions }
  }

  async sendTestPreview(sock: WASocket, groupJid: string): Promise<boolean> {
    const today = getDhakaDate()
    const res = await apiClient.getMarketDuties(groupJid, today)
    if (!res.success) {
      await sock.sendMessage(groupJid, { text: `❌ বাজার ডেটা লোড করা যায়নি: ${res.error}` })
      return false
    }

    const duty = (res.startingDuties && res.startingDuties[0]) ||
      (res.activeDuties && res.activeDuties[0]) ||
      (res.allDuties && res.allDuties[0])

    if (!duty) {
      await sock.sendMessage(groupJid, {
        text: `ℹ️ এই মাসে মেসের বাজার সময়সূচিতে কোনো এন্ট্রি নেই। ওয়েবসাইটের "বাজার সময়সূচি" থেকে ডিউটি সেট করুন।`,
      })
      return false
    }

    let participantIds: Set<string> | undefined
    try {
      const meta = await sock.groupMetadata(groupJid)
      participantIds = new Set(meta.participants.map((p) => p.id))
    } catch {}

    const { mentionTag, mentionJids } = this.resolveMemberMention(duty.member, participantIds)
    const previewMessage = `🧪 *[টেস্ট প্রিভিউ - বাজার ডিউটি নোটিশ]*\n\n` +
      this.buildDutyStartMessage(duty, mentionTag, res.monthKey || today.slice(0, 7))

    await sock.sendMessage(groupJid, {
      text: previewMessage,
      mentions: mentionJids,
    })
    return true
  }
}

export const marketDutyNotifier = new MarketDutyNotifier()
