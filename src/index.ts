const BASE62_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

let lastTimestamp = 0;
let counter = 0;

export const constants = {
  TIMESTAMP_LENGTH: 9,
  DEFAULT_RANDOM_LENGTH: 7,
  BASE62_CHARS,
  MIN_TIMESTAMP: 946684800000,
  MAX_TIMESTAMP: 32503680000000,
} as const;

export interface DecodedZeroId<T = Record<string, unknown>> {
  timestamp: number;
  createdAt: Date;
  metadata?: T;
}

export interface ZeroIdOptions<T = Record<string, unknown>> {
  prefix?: string;
  randomLength?: number;
  metadata?: T;
  checksum?: boolean;
}

export interface TimestampRange {
  oldest: number;
  newest: number;
  oldestDate: Date;
  newestDate: Date;
  span: number;
}

function encodeBase62(num: number | bigint, length: number): string {
  let n = typeof num === "bigint" ? num : BigInt(num);
  let result = "";

  for (let i = 0; i < length; i++) {
    result = BASE62_CHARS[Number(n % 62n)] + result;
    n = n / 62n;
  }

  return result;
}

function decodeBase62(str: string): bigint {
  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = str[i]!;
    const value = BASE62_CHARS.indexOf(char);
    if (value === -1) return -1n;
    num = num * 62n + BigInt(value);
  }
  return num;
}

function randomBase62(length: number): string {
  let result = "";

  while (result.length < length) {
    const needed = length - result.length;
    const bytes = new Uint8Array(needed + 4);
    crypto.getRandomValues(bytes);

    for (let i = 0; i < bytes.length && result.length < length; i++) {
      if (bytes[i]! < 248) {
        result += BASE62_CHARS[bytes[i]! % 62];
      }
    }
  }

  return result;
}

function encodeMetadata(metadata: Record<string, unknown>): string {
  const json = JSON.stringify(metadata);
  const bytes = new TextEncoder().encode(json);
  let result = "";

  for (const byte of bytes) {
    result += BASE62_CHARS[Math.floor(byte / 62)] + BASE62_CHARS[byte % 62];
  }

  const lengthEncoded = encodeBase62(result.length, 3);
  return lengthEncoded + result;
}

function decodeMetadata<T>(
  encoded: string,
): { metadata: T; length: number } | null {
  if (encoded.length < 3) return null;

  const lengthPart = encoded.slice(0, 3);
  const metadataLength = Number(decodeBase62(lengthPart));

  if (metadataLength < 0 || encoded.length < 3 + metadataLength) return null;

  const metadataPart = encoded.slice(3, 3 + metadataLength);

  if (metadataPart.length % 2 !== 0) return null;

  const bytes: number[] = [];
  for (let i = 0; i < metadataPart.length; i += 2) {
    const high = BASE62_CHARS.indexOf(metadataPart[i]!);
    const low = BASE62_CHARS.indexOf(metadataPart[i + 1]!);
    if (high === -1 || low === -1) return null;
    bytes.push(high * 62 + low);
  }

  try {
    const json = new TextDecoder().decode(new Uint8Array(bytes));
    return { metadata: JSON.parse(json) as T, length: 3 + metadataLength };
  } catch {
    return null;
  }
}

function calculateChecksum(data: string): string {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + BASE62_CHARS.indexOf(data[i]!) * (i + 1)) % 3844;
  }
  return encodeBase62(sum, 2);
}

function verifyChecksum(id: string): boolean {
  if (id.length < 2) return false;
  const data = id.slice(0, -2);
  const checksum = id.slice(-2);
  return calculateChecksum(data) === checksum;
}

export function zeroId<T extends Record<string, unknown>>(
  options: ZeroIdOptions<T> = {},
): string {
  const { prefix = "", randomLength = 7, metadata, checksum = false } = options;
  const now = Date.now();

  if (now === lastTimestamp) {
    counter++;
  } else {
    lastTimestamp = now;
    counter = 0;
  }

  const timestampWithCounter = BigInt(now) * 1000n + BigInt(counter % 1000);
  const timestampPart = encodeBase62(timestampWithCounter, 9);
  const metadataPart = metadata ? encodeMetadata(metadata) : "";
  const randomPart = randomBase62(randomLength);

  const core = timestampPart + metadataPart + randomPart;
  const checksumPart = checksum ? calculateChecksum(core) : "";

  return prefix + core + checksumPart;
}

export function zeroIdAt<T extends Record<string, unknown>>(
  timestamp: number | Date,
  options: Omit<ZeroIdOptions<T>, "prefix"> & { prefix?: string } = {},
): string {
  const { prefix = "", randomLength = 7, metadata, checksum = false } = options;
  const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp;

  const timestampWithCounter = BigInt(ts) * 1000n;
  const timestampPart = encodeBase62(timestampWithCounter, 9);
  const metadataPart = metadata ? encodeMetadata(metadata) : "";
  const randomPart = randomBase62(randomLength);

  const core = timestampPart + metadataPart + randomPart;
  const checksumPart = checksum ? calculateChecksum(core) : "";

  return prefix + core + checksumPart;
}

export function batch<T extends Record<string, unknown>>(
  count: number,
  options: ZeroIdOptions<T> = {},
): string[] {
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    results.push(zeroId(options));
  }
  return results;
}

export function decodeZeroId<T = Record<string, unknown>>(
  id: string,
  prefix: string = "",
  options: { checksum?: boolean } = {},
): DecodedZeroId<T> | null {
  if (prefix && !id.startsWith(prefix)) {
    return null;
  }

  let unprefixed = id.slice(prefix.length);

  if (options.checksum) {
    if (!verifyChecksum(unprefixed)) return null;
    unprefixed = unprefixed.slice(0, -2);
  }

  if (unprefixed.length < 10 || !/^[0-9A-Za-z]+$/.test(unprefixed)) {
    return null;
  }

  const timestampPart = unprefixed.slice(0, 9);
  const decoded = decodeBase62(timestampPart);

  if (decoded < 0n) return null;

  const timestamp = Number(decoded / 1000n);

  if (
    timestamp < constants.MIN_TIMESTAMP ||
    timestamp > constants.MAX_TIMESTAMP
  ) {
    return null;
  }

  const remaining = unprefixed.slice(9);
  const metadataResult = decodeMetadata<T>(remaining);

  return {
    timestamp,
    createdAt: new Date(timestamp),
    metadata: metadataResult?.metadata,
  };
}

export function extractTimestamp(
  id: string,
  prefix: string = "",
): number | null {
  if (prefix && !id.startsWith(prefix)) {
    return null;
  }

  const unprefixed = id.slice(prefix.length);

  if (unprefixed.length < 9 || !/^[0-9A-Za-z]+$/.test(unprefixed.slice(0, 9))) {
    return null;
  }

  const timestampPart = unprefixed.slice(0, 9);
  const decoded = decodeBase62(timestampPart);

  if (decoded < 0n) return null;

  const timestamp = Number(decoded / 1000n);

  if (
    timestamp < constants.MIN_TIMESTAMP ||
    timestamp > constants.MAX_TIMESTAMP
  ) {
    return null;
  }

  return timestamp;
}

export function getAge(id: string, prefix: string = ""): number | null {
  const timestamp = extractTimestamp(id, prefix);
  if (timestamp === null) return null;
  return Date.now() - timestamp;
}

export function isBefore(
  id: string,
  date: number | Date,
  prefix: string = "",
): boolean {
  const timestamp = extractTimestamp(id, prefix);
  if (timestamp === null) return false;
  const compareTime = date instanceof Date ? date.getTime() : date;
  return timestamp < compareTime;
}

export function isAfter(
  id: string,
  date: number | Date,
  prefix: string = "",
): boolean {
  const timestamp = extractTimestamp(id, prefix);
  if (timestamp === null) return false;
  const compareTime = date instanceof Date ? date.getTime() : date;
  return timestamp > compareTime;
}

export function extractPrefix(
  id: string,
  knownPrefixes?: string[],
): string | null {
  if (knownPrefixes) {
    for (const prefix of knownPrefixes) {
      if (id.startsWith(prefix)) {
        return prefix;
      }
    }
    return null;
  }

  const underscoreIndex = id.indexOf("_");
  if (underscoreIndex > 0 && underscoreIndex < id.length - 10) {
    return id.slice(0, underscoreIndex + 1);
  }

  return null;
}

export function isValidZeroId(
  id: string,
  prefix: string = "",
  options: { checksum?: boolean } = {},
): boolean {
  return decodeZeroId(id, prefix, options) !== null;
}

export function compareZeroIds(
  a: string,
  b: string,
  prefix: string = "",
): number {
  const unprefixedA = prefix ? a.slice(prefix.length) : a;
  const unprefixedB = prefix ? b.slice(prefix.length) : b;

  if (unprefixedA.length < 9 || unprefixedB.length < 9) {
    throw new Error("Invalid zeroId format");
  }

  const timestampA = unprefixedA.slice(0, 9);
  const timestampB = unprefixedB.slice(0, 9);

  if (timestampA < timestampB) return -1;
  if (timestampA > timestampB) return 1;
  return 0;
}

export function getTimestampRange(
  ids: string[],
  prefix: string = "",
): TimestampRange | null {
  if (ids.length === 0) return null;

  let oldest = Infinity;
  let newest = -Infinity;

  for (const id of ids) {
    const timestamp = extractTimestamp(id, prefix);
    if (timestamp === null) continue;
    if (timestamp < oldest) oldest = timestamp;
    if (timestamp > newest) newest = timestamp;
  }

  if (oldest === Infinity || newest === -Infinity) return null;

  return {
    oldest,
    newest,
    oldestDate: new Date(oldest),
    newestDate: new Date(newest),
    span: newest - oldest,
  };
}

export function toBuffer(id: string, prefix: string = ""): Uint8Array {
  const unprefixed = id.slice(prefix.length);
  const bytes: number[] = [];

  for (let i = 0; i < unprefixed.length; i += 2) {
    if (i + 1 < unprefixed.length) {
      const high = BASE62_CHARS.indexOf(unprefixed[i]!);
      const low = BASE62_CHARS.indexOf(unprefixed[i + 1]!);
      bytes.push((high << 4) | (low >> 2));
      if (i + 2 < unprefixed.length) {
        const next = BASE62_CHARS.indexOf(unprefixed[i + 2]!);
        bytes.push(((low & 0x03) << 6) | next);
        i++;
      }
    } else {
      bytes.push(BASE62_CHARS.indexOf(unprefixed[i]!) << 2);
    }
  }

  return new Uint8Array(bytes);
}

export function fromBuffer(buffer: Uint8Array, prefix: string = ""): string {
  let result = "";
  let i = 0;

  while (i < buffer.length) {
    const b1 = buffer[i]!;
    result += BASE62_CHARS[b1 >> 2];

    if (i + 1 < buffer.length) {
      const b2 = buffer[i + 1]!;
      result += BASE62_CHARS[((b1 & 0x03) << 4) | (b2 >> 4)];
      result +=
        BASE62_CHARS[
          ((b2 & 0x0f) << 2) | (i + 2 < buffer.length ? buffer[i + 2]! >> 6 : 0)
        ];

      if (i + 2 < buffer.length) {
        result += BASE62_CHARS[buffer[i + 2]! & 0x3f];
        i += 3;
      } else {
        i += 2;
      }
    } else {
      result += BASE62_CHARS[(b1 & 0x03) << 4];
      i++;
    }
  }

  return prefix + result;
}

export function toUUID(id: string, prefix: string = ""): string {
  const unprefixed = id.slice(prefix.length);
  let hex = "";

  for (const char of unprefixed) {
    const val = BASE62_CHARS.indexOf(char);
    hex += val.toString(16).padStart(2, "0");
  }

  hex = hex.padEnd(32, "0").slice(0, 32);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function fromUUID(uuid: string, prefix: string = ""): string {
  const hex = uuid.replace(/-/g, "");
  let result = "";

  for (let i = 0; i < hex.length; i += 2) {
    const val = parseInt(hex.slice(i, i + 2), 16);
    if (val < 62) {
      result += BASE62_CHARS[val];
    } else {
      result += BASE62_CHARS[val % 62];
    }
  }

  return prefix + result;
}

export function resetCounter(): void {
  lastTimestamp = 0;
  counter = 0;
}
