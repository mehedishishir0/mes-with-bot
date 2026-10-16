import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { selectedMealCount } from '../src/pollVote.js'

const poll = { options: Array.from({ length: 7 }, (_, count) => ({ optionName: count === 0 ? '0 টি (বন্ধ)' : `${count} টি` })) }
const selection = (name: string) => ({ selectedOptions: [createHash('sha256').update(name).digest()] })

test('uses the decrypted selected option instead of recording every vote as zero', () => {
  assert.equal(selectedMealCount(poll, selection('1 টি')), 1)
  assert.equal(selectedMealCount(poll, selection('2 টি')), 2)
  assert.equal(selectedMealCount(poll, selection('3 টি')), 3)
  assert.equal(selectedMealCount(poll, selection('4 টি')), 4)
  assert.equal(selectedMealCount(poll, selection('5 টি')), 5)
  assert.equal(selectedMealCount(poll, selection('6 টি')), 6)
  assert.equal(selectedMealCount(poll, selection('0 টি (বন্ধ)')), 0)
  assert.equal(selectedMealCount(poll, { selectedOptions: [] }), 0)
  assert.equal(selectedMealCount(poll, selection('unknown')), null)
})
