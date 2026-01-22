# Zero ID

A compact, time-sortable unique identifier for JavaScript and TypeScript.

## Installation

```bash
npm install zero-id
```

## Usage

```typescript
import {
  zeroId,
  zeroIdAt,
  batch,
  decodeZeroId,
  isValidZeroId,
  compareZeroIds,
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
} from "zero-id";
```

## Core Functions

### `zeroId(options?)`

Generate a unique ID.

```typescript
const id = zeroId();
// => "4kN7pQ2xR8mB5vLw"

const userId = zeroId({ prefix: "user_" });
// => "user_4kN7pQ2xR8mB5vLw"

const orderId = zeroId({
  prefix: "order_",
  randomLength: 10,
  metadata: { amount: 99.99, currency: "USD" },
  checksum: true,
});
```

### `zeroIdAt(timestamp, options?)`

Generate an ID with a specific timestamp.

```typescript
const id = zeroIdAt(1700000000000);
const id = zeroIdAt(new Date("2024-01-15"));
const id = zeroIdAt(Date.now() - 86400000, { prefix: "old_" });
```

### `batch(count, options?)`

Generate multiple IDs at once.

```typescript
const ids = batch(100);
const userIds = batch(50, { prefix: "user_" });
```

### `decodeZeroId(id, prefix?, options?)`

Decode an ID to get its timestamp, creation date, and metadata.

```typescript
const decoded = decodeZeroId(id);
// => { timestamp: 1634567890123, createdAt: Date(...), metadata: undefined }

const decoded = decodeZeroId(orderId, "order_");
// => { timestamp: ..., createdAt: Date(...), metadata: { amount: 99.99, currency: "USD" } }

const decoded = decodeZeroId(id, "", { checksum: true });
```

### `isValidZeroId(id, prefix?, options?)`

Check if an ID is valid.

```typescript
isValidZeroId(id); // => true
isValidZeroId(userId, "user_"); // => true
isValidZeroId(checksumId, "", { checksum: true }); // => true
```

### `compareZeroIds(a, b, prefix?)`

Compare two IDs for sorting.

```typescript
ids.sort(compareZeroIds);
ids.sort((a, b) => compareZeroIds(a, b, "user_"));
```

## Time Utilities

### `extractTimestamp(id, prefix?)`

Get the timestamp without full decode.

```typescript
const timestamp = extractTimestamp(id);
// => 1634567890123
```

### `getAge(id, prefix?)`

Get the age of an ID in milliseconds.

```typescript
const age = getAge(id);
// => 3600000 (1 hour)
```

### `isBefore(id, date, prefix?)` / `isAfter(id, date, prefix?)`

Check if an ID was created before/after a specific time.

```typescript
const cutoff = new Date("2024-01-01");
const oldIds = ids.filter((id) => isBefore(id, cutoff));
const newIds = ids.filter((id) => isAfter(id, cutoff));

isBefore(id, Date.now() - 86400000); // created more than 1 day ago?
```

### `getTimestampRange(ids, prefix?)`

Get the time range of a collection of IDs.

```typescript
const range = getTimestampRange(ids);
// => { oldest: 1700000000000, newest: 1700005000000, oldestDate: Date(...), newestDate: Date(...), span: 5000000 }
```

## Prefix Utilities

### `extractPrefix(id, knownPrefixes?)`

Extract the prefix from an ID.

```typescript
extractPrefix("user_4kN7pQ2xR8mB5vLw");
// => "user_"

extractPrefix("4kN7pQ2xR8mB5vLw");
// => null

extractPrefix("user_abc123", ["user_", "order_"]);
// => "user_"
```

## Conversion Utilities

### `toBuffer(id, prefix?)` / `fromBuffer(buffer, prefix?)`

Convert to/from binary format for compact storage.

```typescript
const buffer = toBuffer(id);
const restored = fromBuffer(buffer);
```

### `toUUID(id, prefix?)` / `fromUUID(uuid, prefix?)`

Convert to/from standard UUID format.

```typescript
const uuid = toUUID(id);
// => "550e8400-e29b-41d4-a716-446655440000"

const id = fromUUID(uuid);
```

## Constants

```typescript
import { constants } from "zero-id";

constants.TIMESTAMP_LENGTH; // 9
constants.DEFAULT_RANDOM_LENGTH; // 7
constants.BASE62_CHARS; // "0123456789ABC...xyz"
constants.MIN_TIMESTAMP; // 946684800000 (year 2000)
constants.MAX_TIMESTAMP; // 32503680000000 (year 3000)
```

## Options Reference

```typescript
interface ZeroIdOptions<T> {
  prefix?: string; // Prefix to prepend (e.g., "user_")
  randomLength?: number; // Random part length (default: 7)
  metadata?: T; // Metadata object to embed
  checksum?: boolean; // Add 2-char checksum for validation
}
```

## Format

| Part       | Length   | Description                  |
| ---------- | -------- | ---------------------------- |
| Prefix     | Variable | Optional (e.g., "user\_")    |
| Timestamp  | 9 chars  | Base62 encoded milliseconds  |
| Metadata   | Variable | Optional, length-prefixed    |
| Random     | 7 chars  | Configurable random data     |
| Checksum   | 2 chars  | Optional validation checksum |

Base62 encoding (0-9, A-Z, a-z) - URL-safe, no special characters.

## License

MIT