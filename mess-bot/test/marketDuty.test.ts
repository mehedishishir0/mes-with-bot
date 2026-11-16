import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

test('market duty advance notification notifies for tomorrow with proper template', async () => {
  const originalCwd = process.cwd()
  const originalSecret = process.env.BOT_SECRET_KEY
  const isolatedDir = mkdtempSync(path.join(tmpdir(), 'mess-bot-duty-'))
  process.chdir(isolatedDir)
  process.env.BOT_SECRET_KEY = 'test-only-bot-secret'

  const { marketDutyNotifier } = await import('../src/marketDutyNotifier.js')
  const { apiClient } = await import('../src/apiClient.js')
  const { getDhakaDate } = await import('../src/config.js')

  const today = getDhakaDate(0)
  const tomorrow = getDhakaDate(1)
  assert.notEqual(today, tomorrow)

  const tomorrowDayNum = parseInt(tomorrow.slice(8, 10), 10)
  const testDuty = {
    id: 'duty-1',
    startDay: tomorrowDayNum,
    endDay: tomorrowDayNum + 2,
    totalDays: 3,
    daysRemaining: 3,
    note: 'মাছ ও সবজি কিনবেন',
    member: {
      id: 'mem-1',
      externalId: 'ext-1',
      name: 'শিশির',
      phone: '01700000000',
      whatsappLid: '123456789',
      initials: 'SH',
      color: '#3b82f6',
    },
  }

  // 1. Check template text
  const msgText = marketDutyNotifier.buildDutyStartMessage(testDuty, '@123456789', tomorrow.slice(0, 7))
  assert.match(msgText, /আগামীকাল থেকে নতুন বাজার ডিউটি শুরু!/)
  assert.match(msgText, new RegExp(`আগামীকাল \\(${tomorrowDayNum} তারিখ\\) থেকে আপনার মেসের বাজার ডিউটি শুরু হবে`))
  assert.match(msgText, /📌 \*স্ট্যাটাস:\* আগামীকাল ১ম দিন \(ডিউটি শুরু\)/)
  assert.match(msgText, /শিশির/)
  assert.match(msgText, /মাছ ও সবজি কিনবেন/)
  assert.match(msgText, /বাজার সংক্রান্ত গুরুত্বপূর্ণ টিপস/)

  // 2. Check checkAndNotifyMarketDuty queries tomorrow
  let requestedDate = ''
  apiClient.getMarketDuties = async (_groupId?: string, date?: string) => {
    requestedDate = date || ''
    return {
      success: true,
      monthKey: tomorrow.slice(0, 7),
      day: tomorrowDayNum,
      startingDuties: [testDuty],
      activeDuties: [],
      allDuties: [testDuty],
    }
  }

  const sentMessages: Array<{ jid: string; content: any }> = []
  const mockSock = {
    groupMetadata: async () => ({ participants: [{ id: '123456789@lid' }] }),
    sendMessage: async (jid: string, content: any) => {
      sentMessages.push({ jid, content })
      return {}
    },
  } as any

  const result = await marketDutyNotifier.checkAndNotifyMarketDuty(mockSock, 'test-group@g.us')
  assert.equal(requestedDate, tomorrow, 'Should query market duties for tomorrow')
  assert.equal(result.notifiedCount, 1)
  assert.equal(sentMessages.length, 1)
  assert.match(sentMessages[0].content.text, /আগামীকাল থেকে নতুন বাজার ডিউটি শুরু!/)

  // 3. Second run should skip since it is already notified
  const secondResult = await marketDutyNotifier.checkAndNotifyMarketDuty(mockSock, 'test-group@g.us')
  assert.equal(secondResult.notifiedCount, 0, 'Should not notify twice for the same duty date')
  assert.equal(sentMessages.length, 1)

  // Cleanup
  process.chdir(originalCwd)
  if (originalSecret) {
    process.env.BOT_SECRET_KEY = originalSecret
  } else {
    delete process.env.BOT_SECRET_KEY
  }
  rmSync(isolatedDir, { recursive: true, force: true })
})
