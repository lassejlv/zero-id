const BASE62_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

let lastTimestamp = 0;
let counter = 0;

export interface DecodedZeroId<T = Record<string, unknown>> {
  timestamp: number;
  createdAt: Date;
  metadata?: T;
}

export interface ZeroIdOptions<T = Record<string, unknown>> {
  prefix?: string;
  randomLength?: number;
  metadata?: T;
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

export function zeroId<T extends Record<string, unknown>>(
  options: ZeroIdOptions<T> = {},
): string {
  const { prefix = "", randomLength = 7, metadata } = options;
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

  return prefix + timestampPart + metadataPart + randomPart;
}

export function decodeZeroId<T = Record<string, unknown>>(
  id: string,
  prefix: string = "",
): DecodedZeroId<T> | null {
  if (prefix && !id.startsWith(prefix)) {
    return null;
  }

  const unprefixed = id.slice(prefix.length);

  if (unprefixed.length < 10 || !/^[0-9A-Za-z]+$/.test(unprefixed)) {
    return null;
  }

  const timestampPart = unprefixed.slice(0, 9);
  const decoded = decodeBase62(timestampPart);

  if (decoded < 0n) return null;

  const timestamp = Number(decoded / 1000n);
  const minTimestamp = 946684800000;
  const maxTimestamp = 32503680000000;

  if (timestamp < minTimestamp || timestamp > maxTimestamp) {
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

export function isValidZeroId(id: string, prefix: string = ""): boolean {
  return decodeZeroId(id, prefix) !== null;
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

export function resetCounter(): void {
  lastTimestamp = 0;
  counter = 0;
}
