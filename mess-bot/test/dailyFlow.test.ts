import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

test('warnings, lock messages, and late votes follow the daily meal flow', async () => {
  const originalCwd = process.cwd()
  const originalSecret = process.env.BOT_SECRET_KEY
  const isolatedDir = mkdtempSync(path.join(tmpdir(), 'mess-bot-flow-'))
  process.chdir(isolatedDir)
  process.env.BOT_SECRET_KEY = 'test-only-bot-secret'
  const { PollManager } = await import('../src/pollManager.js')
  const { apiClient } = await import('../src/apiClient.js')
  const { getDhakaDate } = await import('../src/config.js')
  const manager = new PollManager()
  const sent: string[] = []
  const sock = { sendMessage: async (_jid: string, content: { text?: string }) => { if (content.text) sent.push(content.text); return {} } } as any
  const originalSummary = apiClient.getSummary
  const originalMember = apiClient.getMember
  const originalVote = apiClient.sendVote
  try {
    apiClient.getSummary = async () => ({
      success: true,
      summary: { totalLunch: 2, totalDinner: 1, membersCount: 2, votedCount: 1 },
      members: [
        { id: 'a', name: 'রহিম', phone: null, lunch: 2, dinner: 1, total: 3 },
        { id: 'b', name: 'করিম', phone: null, lunch: 0, dinner: 0, total: 0 },
      ],
    })
    apiClient.getMember = async () => ({ success: true, memberName: 'রহিম' })
    apiClient.sendVote = async () => { throw new Error('Locked vote reached the vote API') }

    await manager.sendClosingWarning(sock, 'group@g.us', 'lunch')
    await manager.sendClosingWarning(sock, 'group@g.us', 'dinner')
    assert.match(sent[0], /১৫ মিনিট/)
    assert.match(sent[0], /১০:০০/)
    assert.match(sent[1], /৩:০০/)

    await manager.lockLunchPoll(sock, 'group@g.us')
    await manager.lockDinnerPoll(sock, 'group@g.us')
    assert.match(sent[2], /লক করা হয়েছে/)
    assert.match(sent[3], /রহিম: 2 টি/)
    assert.match(sent[3], /করিম/)
    assert.match(sent[3], /মোট দুপুরের মিল: 2 টি/)
    assert.match(sent[5], /মোট রাতের মিল: 1 টি/)

    ;(manager as any).activePolls.set('poll-1', {
      id: 'poll-1',
      key: { id: 'poll-1', remoteJid: 'group@g.us' },
      message: {},
      pollCreation: { options: [] },
      pollUpdates: [],
      mealType: 'lunch',
      date: getDhakaDate(),
      isLocked: true,
    })
    const update = { pollUpdateMessageKey: { participant: '123@lid' }, vote: { selectedOptions: [] } } as any
    await manager.handlePollUpdate(sock, 'poll-1', update)
    assert.match(sent[6], /রহিম/)
    assert.match(sent[6], /গণনা করা হয়নি/)
    await manager.handlePollUpdate(sock, 'poll-1', update)
    assert.equal(sent.length, 7)
  } finally {
    apiClient.getSummary = originalSummary
    apiClient.getMember = originalMember
    apiClient.sendVote = originalVote
    if (originalSecret === undefined) delete process.env.BOT_SECRET_KEY
    else process.env.BOT_SECRET_KEY = originalSecret
    process.chdir(originalCwd)
    rmSync(isolatedDir, { recursive: true, force: true })
  }
})
