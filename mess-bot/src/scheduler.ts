import cron from 'node-cron'
import type { WASocket } from '@whiskeysockets/baileys'
import { CONFIG } from './config.js'
import { pollManager } from './pollManager.js'

let isSchedulerRunning = false
let currentSock: WASocket | null = null
let currentGetGroupJid: (() => string | null) | null = null

export function pauseScheduler() {
  currentSock = null
}

export function setupScheduler(sock: WASocket, getGroupJid: () => string | null) {
  currentSock = sock
  currentGetGroupJid = getGroupJid

  if (isSchedulerRunning) {
    console.log('[Scheduler] Updated active WhatsApp socket for existing cron jobs.')
    return
  }

  isSchedulerRunning = true
  const timezone = CONFIG.TIMEZONE
  console.log(`[Scheduler] Initializing cron scheduler with timezone: ${timezone}`)

  // 00:10 -> Send Lunch Poll
  cron.schedule(
    '10 0 * * *',
    async () => {
      const sock = currentSock
      const groupJid = currentGetGroupJid?.()
      if (!sock || !groupJid) {
        console.warn('[Scheduler] Cannot send Lunch Poll: Socket or Group JID not ready')
        return
      }
      console.log('[Scheduler] 12:10 AM: Triggering Lunch Poll...')
      await pollManager.sendLunchPoll(sock, groupJid)
    },
    { timezone }
  )

  // 09:45 -> Remind members before the lunch cutoff
  cron.schedule(
    '45 9 * * *',
    async () => {
      const sock = currentSock
      const groupJid = currentGetGroupJid?.()
      if (!sock || !groupJid) return
      await pollManager.sendClosingWarning(sock, groupJid, 'lunch')
    },
    { timezone }
  )

  // 2. Morning 10:00 AM -> Lock Lunch Poll & Send Summary
  cron.schedule(
    '0 10 * * *',
    async () => {
      const sock = currentSock
      const groupJid = currentGetGroupJid?.()
      if (!sock || !groupJid) return
      console.log('[Scheduler] 10:00 AM: Locking Lunch Poll...')
      await pollManager.lockLunchPoll(sock, groupJid)
    },
    { timezone }
  )

  // 11:00 -> Send Dinner Poll
  cron.schedule(
    '0 11 * * *',
    async () => {
      const sock = currentSock
      const groupJid = currentGetGroupJid?.()
      if (!sock || !groupJid) {
        console.warn('[Scheduler] Cannot send Dinner Poll: Socket or Group JID not ready')
        return
      }
      console.log('[Scheduler] 11:00 AM: Triggering Dinner Poll...')
      await pollManager.sendDinnerPoll(sock, groupJid)
    },
    { timezone }
  )

  // 14:45 -> Remind members before the dinner cutoff
  cron.schedule(
    '45 14 * * *',
    async () => {
      const sock = currentSock
      const groupJid = currentGetGroupJid?.()
      if (!sock || !groupJid) return
      await pollManager.sendClosingWarning(sock, groupJid, 'dinner')
    },
    { timezone }
  )

  // 4. Afternoon 03:00 PM (15:00) -> Lock Dinner Poll & Send Summary
  cron.schedule(
    '0 15 * * *',
    async () => {
      const sock = currentSock
      const groupJid = currentGetGroupJid?.()
      if (!sock || !groupJid) return
      console.log('[Scheduler] 03:00 PM: Locking Dinner Poll...')
      await pollManager.lockDinnerPoll(sock, groupJid)
    },
    { timezone }
  )

  console.log('[Scheduler] All 6 daily routines scheduled successfully:')
  console.log('  • 00:10 (12:10 AM) -> দুপুরের মিলের পোল যাবে')
  console.log('  • 09:45 (09:45 AM) -> দুপুরের ভোটের সতর্কবার্তা যাবে')
  console.log('  • 10:00 (10:00 AM) -> দুপুরের মিল লক হবে')
  console.log('  • 11:00 (11:00 AM) -> রাতের মিলের পোল যাবে')
  console.log('  • 14:45 (02:45 PM) -> রাতের ভোটের সতর্কবার্তা যাবে')
  console.log('  • 15:00 (03:00 PM) -> রাতের মিল লক হবে')
}

