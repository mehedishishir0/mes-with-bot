import { createHash } from 'crypto'
import type { proto } from '@whiskeysockets/baileys'

// Baileys emits decrypted option hashes in messages.update.
export function selectedMealCount(
  poll: proto.Message.IPollCreationMessage,
  vote: proto.Message.IPollVoteMessage,
): number | null {
  const selected = vote.selectedOptions || []
  if (selected.length === 0) return 0
  if (selected.length !== 1) return null

  const option = poll.options?.find((candidate) =>
    Buffer.from(selected[0]).equals(createHash('sha256').update(candidate.optionName || '').digest())
  )
  const match = option?.optionName?.match(/^([0-6]) টি/)
  return match ? Number(match[1]) : null
}
