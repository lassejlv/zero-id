/**
 * zeroId - A compact, aesthetic unique identifier
 *
 * Format: 16 characters, base62 encoded
 * Example: 4kN7pQ2xR8mB5vLw
 *
 * Features:
 * - Ultra compact (16 chars)
 * - Time-sortable
 * - High entropy
 * - Mixed case alphanumeric (readable, URL-safe)
 * - No separators or special characters
 */

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Encodes a number to base62 string with fixed length
 */
function encodeBase62(num: number | bigint, length: number): string {
  let n = typeof num === 'bigint' ? num : BigInt(num)
  let result = ''

  for (let i = 0; i < length; i++) {
    result = BASE62_CHARS[Number(n % 62n)] + result
    n = n / 62n
  }

  return result
}

/**
 * Decodes a base62 string to number
 */
function decodeBase62(str: string): bigint {
  let num = 0n
  for (let i = 0; i < str.length; i++) {
    const char = str[i]!
    const value = BASE62_CHARS.indexOf(char)
    if (value === -1) return -1n
    num = num * 62n + BigInt(value)
  }
  return num
}

/**
 * Generates random base62 string
 */
function randomBase62(length: number): string {
  let result = ''
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS[bytes[i]! % 62]
  }

  return result
}

/**
 * Generates a new zeroId
 */
export function zeroId(): string {
  const timestamp = Date.now()
  const timestampPart = encodeBase62(timestamp, 9)
  const randomPart = randomBase62(7)

  return timestampPart + randomPart
}

/**
 * Decodes a zeroId to extract timestamp
 */
export function decodeZeroId(id: string): {
  timestamp: number
  createdAt: Date
} | null {
  if (id.length !== 16 || !/^[0-9A-Za-z]+$/.test(id)) {
    return null
  }

  const timestampPart = id.slice(0, 9)
  const timestamp = Number(decodeBase62(timestampPart))

  if (timestamp < 0) return null

  return {
    timestamp,
    createdAt: new Date(timestamp),
  }
}

/**
 * Validates a zeroId format
 */
export function isValidZeroId(id: string): boolean {
  return decodeZeroId(id) !== null
}

/**
 * Compares two zeroIds chronologically
 */
export function compareZeroIds(a: string, b: string): number {
  const decodedA = decodeZeroId(a)
  const decodedB = decodeZeroId(b)

  if (!decodedA || !decodedB) {
    throw new Error('Invalid zeroId format')
  }

  if (decodedA.timestamp < decodedB.timestamp) return -1
  if (decodedA.timestamp > decodedB.timestamp) return 1
  return 0
}
