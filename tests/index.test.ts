import { expect, test, beforeEach } from "vitest";
import {
  zeroId,
  isValidZeroId,
  decodeZeroId,
  compareZeroIds,
  resetCounter,
} from "../src";

beforeEach(() => {
  resetCounter();
});

test("should generate a valid zeroId with default length", () => {
  const id = zeroId();
  expect(id).toHaveLength(16); // 9 timestamp + 7 random
  expect(isValidZeroId(id)).toBe(true);
  expect(decodeZeroId(id)).toBeDefined();
});

test("should generate a valid zeroId with custom random length", () => {
  const id = zeroId({ randomLength: 10 });
  expect(id).toHaveLength(19); // 9 timestamp + 10 random
  expect(isValidZeroId(id)).toBe(true);
});

test("should generate a valid zeroId with prefix", () => {
  const id = zeroId({ prefix: "user_" });
  expect(id).toHaveLength(21); // 5 prefix + 9 timestamp + 7 random
  expect(id.startsWith("user_")).toBe(true);
  expect(isValidZeroId(id, "user_")).toBe(true);
  expect(decodeZeroId(id, "user_")).toBeDefined();
});

test("should generate a valid zeroId with prefix and custom random length", () => {
  const id = zeroId({ prefix: "order_", randomLength: 10 });
  expect(id).toHaveLength(25); // 6 prefix + 9 timestamp + 10 random
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
  // Generate many IDs rapidly (likely same millisecond)
  const ids: string[] = [];
  for (let i = 0; i < 100; i++) {
    ids.push(zeroId());
  }

  // Sort using compareZeroIds
  const sortedIds = [...ids].sort(compareZeroIds);

  // Should maintain generation order due to monotonic counter
  expect(sortedIds).toEqual(ids);
});

test("should generate IDs that sort correctly as strings", () => {
  // Due to base62 encoding being order-preserving,
  // lexicographic string sort should work for timestamp portion
  const id1 = zeroId();

  // Wait to ensure different timestamp
  const later = Date.now() + 100;
  while (Date.now() < later) {
    // busy wait
  }

  const id2 = zeroId();

  // Timestamp portions should sort correctly
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

  // After reset, counter starts fresh
  // We can't directly test counter value, but we can verify IDs are still valid
  const id = zeroId();
  expect(isValidZeroId(id)).toBe(true);
});
