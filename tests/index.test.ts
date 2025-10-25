import { expect, test } from 'vitest'
import { zeroId, isValidZeroId, decodeZeroId, compareZeroIds } from '../src'

test('should generate a valid zeroId', () => {
  const id = zeroId(16)
  console.log('id', id)
  expect(isValidZeroId(id)).toBe(true)
  expect(decodeZeroId(id)).toBeDefined()
})

test('should compare zeroIds correctly', async () => {
  const id1 = zeroId()
  await new Promise((resolve) => setTimeout(resolve, 1))
  const id2 = zeroId()
  expect(compareZeroIds(id1, id2)).toBe(-1)
})
