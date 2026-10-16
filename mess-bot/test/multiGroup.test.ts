import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

test('locking one mess group never locks another group poll', async () => {
  const originalCwd = process.cwd()
  const originalSecret = process.env.BOT_SECRET_KEY
  const isolatedDir = mkdtempSync(path.join(tmpdir(), 'mess-bot-multi-group-'))
  process.env.BOT_SECRET_KEY = 'test-only-bot-secret'
  process.chdir(isolatedDir)
  const { PollManager } = await import('../src/pollManager.js')
  const { apiClient } = await import('../src/apiClient.js')
  const { getDhakaDate } = await import('../src/config.js')
  const manager = new PollManager()
  const originalSummary = apiClient.getSummary
  try {
    apiClient.getSummary = async () => ({
      success: true,
      summary: { totalLunch: 0, totalDinner: 0, membersCount: 0, votedCount: 0 },
      members: [],
    })
    const today = getDhakaDate()
    const polls = (manager as any).activePolls as Map<string, unknown>
    polls.set('group-a-poll', { id: 'group-a-poll', key: { id: 'group-a-poll', remoteJid: 'group-a@g.us' }, message: {}, pollCreation: {}, pollUpdates: [], mealType: 'lunch', date: today, isLocked: false })
    polls.set('group-b-poll', { id: 'group-b-poll', key: { id: 'group-b-poll', remoteJid: 'group-b@g.us' }, message: {}, pollCreation: {}, pollUpdates: [], mealType: 'lunch', date: today, isLocked: false })

    const sock = { sendMessage: async () => ({}) } as any
    await manager.lockLunchPoll(sock, 'group-a@g.us')

    assert.equal((polls.get('group-a-poll') as any).isLocked, true)
    assert.equal((polls.get('group-b-poll') as any).isLocked, false)
  } finally {
    apiClient.getSummary = originalSummary
    if (originalSecret === undefined) delete process.env.BOT_SECRET_KEY
    else process.env.BOT_SECRET_KEY = originalSecret
    process.chdir(originalCwd)
    rmSync(isolatedDir, { recursive: true, force: true })
  }
})
