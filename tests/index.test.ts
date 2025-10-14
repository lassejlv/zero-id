import { expect, test } from 'vitest'
import { zeroId, isValidZeroId, decodeZeroId } from '../src'

test('zeroId', () => {
  const id = zeroId()
  expect(isValidZeroId(id)).toBe(true)
  expect(decodeZeroId(id)).toBeDefined()
})
