import { expect, test, beforeEach } from "vitest";
import {
  zeroId,
  zeroIdAt,
  batch,
  isValidZeroId,
  decodeZeroId,
  compareZeroIds,
  resetCounter,
  extractTimestamp,
  getAge,
  isBefore,
  isAfter,
  extractPrefix,
  getTimestampRange,
  toBuffer,
  fromBuffer,
  toUUID,
  fromUUID,
  constants,
} from "../src";

beforeEach(() => {
  resetCounter();
});

test("should generate a valid zeroId with default length", () => {
  const id = zeroId();
  expect(id).toHaveLength(16);
  expect(isValidZeroId(id)).toBe(true);
  expect(decodeZeroId(id)).toBeDefined();
});

test("should generate a valid zeroId with custom random length", () => {
  const id = zeroId({ randomLength: 10 });
  expect(id).toHaveLength(19);
  expect(isValidZeroId(id)).toBe(true);
});

test("should generate a valid zeroId with prefix", () => {
  const id = zeroId({ prefix: "user_" });
  expect(id).toHaveLength(21);
  expect(id.startsWith("user_")).toBe(true);
  expect(isValidZeroId(id, "user_")).toBe(true);
  expect(decodeZeroId(id, "user_")).toBeDefined();
});

test("should generate a valid zeroId with prefix and custom random length", () => {
  const id = zeroId({ prefix: "order_", randomLength: 10 });
  expect(id).toHaveLength(25);
  expect(id.startsWith("order_")).toBe(true);
  expect(isValidZeroId(id, "order_")).toBe(true);
});

test("should reject zeroId with wrong prefix", () => {
  const id = zeroId({ prefix: "user_" });
  expect(isValidZeroId(id, "order_")).toBe(false);
  expect(decodeZeroId(id, "order_")).toBeNull();
});

test("should generate zeroId with metadata", () => {
  const id = zeroId({ metadata: { userId: 123, role: "admin" } });
  expect(isValidZeroId(id)).toBe(true);

  const decoded = decodeZeroId<{ userId: number; role: string }>(id);
  expect(decoded).not.toBeNull();
  expect(decoded!.metadata).toEqual({ userId: 123, role: "admin" });
});

test("should generate zeroId with prefix and metadata", () => {
  const id = zeroId({
    prefix: "order_",
    metadata: { amount: 99.99, currency: "USD" },
  });

  expect(id.startsWith("order_")).toBe(true);
  expect(isValidZeroId(id, "order_")).toBe(true);

  const decoded = decodeZeroId<{ amount: number; currency: string }>(
    id,
    "order_",
  );
  expect(decoded).not.toBeNull();
  expect(decoded!.metadata).toEqual({ amount: 99.99, currency: "USD" });
});

test("should handle zeroId without metadata", () => {
  const id = zeroId();
  const decoded = decodeZeroId(id);

  expect(decoded).not.toBeNull();
  expect(decoded!.metadata).toBeUndefined();
});

test("should handle complex metadata", () => {
  const metadata = {
    nested: { deep: { value: true } },
    array: [1, 2, 3],
    string: "hello world",
    number: 42,
    boolean: false,
    nullValue: null,
  };

  const id = zeroId({ metadata });
  const decoded = decodeZeroId<typeof metadata>(id);

  expect(decoded).not.toBeNull();
  expect(decoded!.metadata).toEqual(metadata);
});

test("should only contain base62 characters", () => {
  const id = zeroId();
  expect(id).toMatch(/^[0-9A-Za-z]+$/);
});

test("should decode zeroId correctly", () => {
  const before = Date.now();
  const id = zeroId();
  const after = Date.now();

  const decoded = decodeZeroId(id);
  expect(decoded).not.toBeNull();
  expect(decoded!.timestamp).toBeGreaterThanOrEqual(before);
  expect(decoded!.timestamp).toBeLessThanOrEqual(after);
  expect(decoded!.createdAt).toBeInstanceOf(Date);
});

test("should return null for invalid zeroId", () => {
  expect(decodeZeroId("")).toBeNull();
  expect(decodeZeroId("short")).toBeNull();
  expect(decodeZeroId("invalid-chars!")).toBeNull();
  expect(decodeZeroId("!!!!!!!!!!")).toBeNull();
});

test("should validate zeroId format", () => {
  expect(isValidZeroId(zeroId())).toBe(true);
  expect(isValidZeroId("invalid")).toBe(false);
  expect(isValidZeroId("")).toBe(false);
  expect(isValidZeroId("contains-dash")).toBe(false);
});

test("should compare zeroIds correctly", async () => {
  const id1 = zeroId();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const id2 = zeroId();

  expect(compareZeroIds(id1, id2)).toBe(-1);
  expect(compareZeroIds(id2, id1)).toBe(1);
  expect(compareZeroIds(id1, id1)).toBe(0);
});

test("should compare zeroIds with prefix correctly", async () => {
  const id1 = zeroId({ prefix: "user_" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const id2 = zeroId({ prefix: "user_" });

  expect(compareZeroIds(id1, id2, "user_")).toBe(-1);
  expect(compareZeroIds(id2, id1, "user_")).toBe(1);
  expect(compareZeroIds(id1, id1, "user_")).toBe(0);
});

test("should throw error when comparing invalid zeroIds", () => {
  const validId = zeroId();
  expect(() => compareZeroIds(validId, "short")).toThrow(
    "Invalid zeroId format",
  );
  expect(() => compareZeroIds("short", validId)).toThrow(
    "Invalid zeroId format",
  );
});

test("should generate unique IDs", () => {
  const ids = new Set<string>();
  const count = 10000;

  for (let i = 0; i < count; i++) {
    ids.add(zeroId());
  }

  expect(ids.size).toBe(count);
});

test("should maintain sort order with monotonic counter", () => {
  const ids: string[] = [];
  for (let i = 0; i < 100; i++) {
    ids.push(zeroId());
  }

  const sortedIds = [...ids].sort(compareZeroIds);

  expect(sortedIds).toEqual(ids);
});

test("should generate IDs that sort correctly as strings", () => {
  const id1 = zeroId();

  const later = Date.now() + 100;
  while (Date.now() < later) {}

  const id2 = zeroId();

  expect(id1.slice(0, 9) < id2.slice(0, 9)).toBe(true);
});

test("should have good distribution of random characters", () => {
  const charCounts: Record<string, number> = {};
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    const id = zeroId();
    const randomPart = id.slice(9);

    for (const char of randomPart) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
  }

  const counts = Object.values(charCounts);
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - avgCount)));

  expect(maxDeviation).toBeLessThan(avgCount * 3);
});

test("resetCounter should reset internal state", () => {
  zeroId();
  zeroId();
  resetCounter();

  const id = zeroId();
  expect(isValidZeroId(id)).toBe(true);
});

test("constants should export expected values", () => {
  expect(constants.TIMESTAMP_LENGTH).toBe(9);
  expect(constants.DEFAULT_RANDOM_LENGTH).toBe(7);
  expect(constants.BASE62_CHARS).toHaveLength(62);
  expect(constants.MIN_TIMESTAMP).toBe(946684800000);
  expect(constants.MAX_TIMESTAMP).toBe(32503680000000);
});

test("zeroIdAt should generate ID with specific timestamp", () => {
  const specificTime = 1700000000000;
  const id = zeroIdAt(specificTime);

  const decoded = decodeZeroId(id);
  expect(decoded).not.toBeNull();
  expect(decoded!.timestamp).toBe(specificTime);
});

test("zeroIdAt should accept Date object", () => {
  const specificDate = new Date("2024-01-15T12:00:00Z");
  const id = zeroIdAt(specificDate);

  const decoded = decodeZeroId(id);
  expect(decoded).not.toBeNull();
  expect(decoded!.timestamp).toBe(specificDate.getTime());
});

test("zeroIdAt should support all options", () => {
  const id = zeroIdAt(1700000000000, {
    prefix: "test_",
    randomLength: 10,
    metadata: { foo: "bar" },
  });

  expect(id.startsWith("test_")).toBe(true);
  expect(isValidZeroId(id, "test_")).toBe(true);

  const decoded = decodeZeroId<{ foo: string }>(id, "test_");
  expect(decoded!.metadata).toEqual({ foo: "bar" });
});

test("batch should generate multiple unique IDs", () => {
  const ids = batch(100);

  expect(ids).toHaveLength(100);
  expect(new Set(ids).size).toBe(100);
  ids.forEach((id) => expect(isValidZeroId(id)).toBe(true));
});

test("batch should respect options", () => {
  const ids = batch(10, { prefix: "batch_", randomLength: 10 });

  ids.forEach((id) => {
    expect(id.startsWith("batch_")).toBe(true);
    expect(isValidZeroId(id, "batch_")).toBe(true);
  });
});

test("extractTimestamp should return timestamp without full decode", () => {
  const before = Date.now();
  const id = zeroId();
  const after = Date.now();

  const timestamp = extractTimestamp(id);
  expect(timestamp).not.toBeNull();
  expect(timestamp).toBeGreaterThanOrEqual(before);
  expect(timestamp).toBeLessThanOrEqual(after);
});

test("extractTimestamp should handle prefix", () => {
  const id = zeroId({ prefix: "user_" });
  const timestamp = extractTimestamp(id, "user_");

  expect(timestamp).not.toBeNull();
  expect(extractTimestamp(id, "wrong_")).toBeNull();
});

test("extractTimestamp should return null for invalid IDs", () => {
  expect(extractTimestamp("")).toBeNull();
  expect(extractTimestamp("short")).toBeNull();
  expect(extractTimestamp("!!!!!!!!!")).toBeNull();
});

test("getAge should return milliseconds since creation", async () => {
  const id = zeroId();
  await new Promise((resolve) => setTimeout(resolve, 50));

  const age = getAge(id);
  expect(age).not.toBeNull();
  expect(age).toBeGreaterThanOrEqual(50);
  expect(age).toBeLessThan(200);
});

test("getAge should handle prefix", () => {
  const id = zeroId({ prefix: "test_" });
  const age = getAge(id, "test_");

  expect(age).not.toBeNull();
  expect(age).toBeGreaterThanOrEqual(0);
});

test("getAge should return null for invalid IDs", () => {
  expect(getAge("invalid")).toBeNull();
});

test("isBefore should check if ID was created before date", () => {
  const pastId = zeroIdAt(Date.now() - 10000);
  const futureId = zeroIdAt(Date.now() + 10000);
  const now = new Date();

  expect(isBefore(pastId, now)).toBe(true);
  expect(isBefore(futureId, now)).toBe(false);
});

test("isBefore should accept timestamp number", () => {
  const id = zeroIdAt(1700000000000);

  expect(isBefore(id, 1700000000001)).toBe(true);
  expect(isBefore(id, 1699999999999)).toBe(false);
});

test("isBefore should handle prefix", () => {
  const id = zeroIdAt(1700000000000, { prefix: "test_" });

  expect(isBefore(id, 1800000000000, "test_")).toBe(true);
});

test("isBefore should return false for invalid IDs", () => {
  expect(isBefore("invalid", new Date())).toBe(false);
});

test("isAfter should check if ID was created after date", () => {
  const pastId = zeroIdAt(Date.now() - 10000);
  const futureId = zeroIdAt(Date.now() + 10000);
  const now = new Date();

  expect(isAfter(pastId, now)).toBe(false);
  expect(isAfter(futureId, now)).toBe(true);
});

test("isAfter should accept timestamp number", () => {
  const id = zeroIdAt(1700000000000);

  expect(isAfter(id, 1699999999999)).toBe(true);
  expect(isAfter(id, 1700000000001)).toBe(false);
});

test("isAfter should handle prefix", () => {
  const id = zeroIdAt(1700000000000, { prefix: "test_" });

  expect(isAfter(id, 1600000000000, "test_")).toBe(true);
});

test("isAfter should return false for invalid IDs", () => {
  expect(isAfter("invalid", new Date())).toBe(false);
});

test("extractPrefix should find underscore-delimited prefix", () => {
  expect(extractPrefix("user_abc123def456")).toBe("user_");
  expect(extractPrefix("order_abc123def456")).toBe("order_");
  expect(extractPrefix("long_prefix_abc123def456")).toBe("long_");
});

test("extractPrefix should return null for no prefix", () => {
  expect(extractPrefix("abc123def456ghi")).toBeNull();
  expect(extractPrefix("_abc123def456")).toBeNull();
});

test("extractPrefix should use known prefixes when provided", () => {
  const knownPrefixes = ["user_", "order_", "product_"];

  expect(extractPrefix("user_abc123", knownPrefixes)).toBe("user_");
  expect(extractPrefix("order_abc123", knownPrefixes)).toBe("order_");
  expect(extractPrefix("unknown_abc123", knownPrefixes)).toBeNull();
});

test("getTimestampRange should return range for valid IDs", () => {
  const ids = [
    zeroIdAt(1700000000000),
    zeroIdAt(1700001000000),
    zeroIdAt(1700002000000),
  ];

  const range = getTimestampRange(ids);

  expect(range).not.toBeNull();
  expect(range!.oldest).toBe(1700000000000);
  expect(range!.newest).toBe(1700002000000);
  expect(range!.span).toBe(2000000);
  expect(range!.oldestDate).toEqual(new Date(1700000000000));
  expect(range!.newestDate).toEqual(new Date(1700002000000));
});

test("getTimestampRange should handle prefix", () => {
  const ids = [
    zeroIdAt(1700000000000, { prefix: "test_" }),
    zeroIdAt(1700005000000, { prefix: "test_" }),
  ];

  const range = getTimestampRange(ids, "test_");

  expect(range).not.toBeNull();
  expect(range!.span).toBe(5000000);
});

test("getTimestampRange should return null for empty array", () => {
  expect(getTimestampRange([])).toBeNull();
});

test("getTimestampRange should return null for all invalid IDs", () => {
  expect(getTimestampRange(["invalid", "also_invalid"])).toBeNull();
});

test("getTimestampRange should skip invalid IDs", () => {
  const ids = [zeroIdAt(1700000000000), "invalid", zeroIdAt(1700001000000)];

  const range = getTimestampRange(ids);

  expect(range).not.toBeNull();
  expect(range!.oldest).toBe(1700000000000);
  expect(range!.newest).toBe(1700001000000);
});

test("toBuffer and fromBuffer should round-trip", () => {
  const id = zeroId();
  const buffer = toBuffer(id);
  const restored = fromBuffer(buffer);

  expect(restored.slice(0, 16)).toBe(id.slice(0, 16));
});

test("toBuffer should handle prefix", () => {
  const id = zeroId({ prefix: "test_" });
  const buffer = toBuffer(id, "test_");
  const restored = fromBuffer(buffer, "test_");

  expect(restored.startsWith("test_")).toBe(true);
});

test("toBuffer should produce smaller output than string", () => {
  const id = zeroId();
  const buffer = toBuffer(id);

  expect(buffer.length).toBeLessThan(id.length);
});

test("toUUID should produce valid UUID format", () => {
  const id = zeroId();
  const uuid = toUUID(id);

  expect(uuid).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
});

test("toUUID should handle prefix", () => {
  const id = zeroId({ prefix: "test_" });
  const uuid = toUUID(id, "test_");

  expect(uuid).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
});

test("fromUUID should convert UUID back to zeroId format", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const id = fromUUID(uuid);

  expect(id).toMatch(/^[0-9A-Za-z]+$/);
  expect(id.length).toBeGreaterThan(0);
});

test("fromUUID should handle prefix", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const id = fromUUID(uuid, "test_");

  expect(id.startsWith("test_")).toBe(true);
});

test("checksum should be added when enabled", () => {
  const idWithoutChecksum = zeroId();
  const idWithChecksum = zeroId({ checksum: true });

  expect(idWithChecksum.length).toBe(idWithoutChecksum.length + 2);
});

test("checksum should validate correctly", () => {
  const id = zeroId({ checksum: true });

  expect(isValidZeroId(id, "", { checksum: true })).toBe(true);
  expect(decodeZeroId(id, "", { checksum: true })).not.toBeNull();
});

test("checksum should detect corruption", () => {
  const id = zeroId({ checksum: true });
  const corrupted = id.slice(0, 5) + (id[5] === "A" ? "B" : "A") + id.slice(6);

  expect(isValidZeroId(corrupted, "", { checksum: true })).toBe(false);
  expect(decodeZeroId(corrupted, "", { checksum: true })).toBeNull();
});

test("checksum should work with prefix", () => {
  const id = zeroId({ prefix: "user_", checksum: true });

  expect(id.startsWith("user_")).toBe(true);
  expect(isValidZeroId(id, "user_", { checksum: true })).toBe(true);
});

test("checksum should work with metadata", () => {
  const id = zeroId({
    checksum: true,
    metadata: { test: "value" },
  });

  const decoded = decodeZeroId<{ test: string }>(id, "", { checksum: true });
  expect(decoded).not.toBeNull();
  expect(decoded!.metadata).toEqual({ test: "value" });
});

test("zeroIdAt should support checksum", () => {
  const id = zeroIdAt(1700000000000, { checksum: true });

  expect(isValidZeroId(id, "", { checksum: true })).toBe(true);

  const decoded = decodeZeroId(id, "", { checksum: true });
  expect(decoded!.timestamp).toBe(1700000000000);
});
