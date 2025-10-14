# Zero ID

A clean and efficient unique identifier for JavaScript and TypeScript.

## Features

- **Ultra compact** - Only 16 characters
- **Time-sortable** - IDs can be sorted chronologically
- **High entropy** - 7 random characters for uniqueness
- **URL-safe** - Base62 encoding (alphanumeric only)
- **No dependencies** - Pure JavaScript with Web Crypto API

## Installation

```bash
npm install zero-id
```

```bash
bun add zero-id
```

## Usage

### Generate an ID

```typescript
import { zeroId } from 'zero-id'

const id = zeroId()
// => "4kN7pQ2xR8mB5vLw"
```

### Decode an ID

Extract the timestamp from a zeroId:

```typescript
import { decodeZeroId } from 'zero-id'

const decoded = decodeZeroId('4kN7pQ2xR8mB5vLw')
// => { timestamp: 1634567890123, createdAt: Date(...) }
```

### Validate an ID

```typescript
import { isValidZeroId } from 'zero-id'

isValidZeroId('4kN7pQ2xR8mB5vLw') // => true
isValidZeroId('invalid-id') // => false
```

### Compare IDs

Sort IDs chronologically:

```typescript
import { compareZeroIds } from 'zero-id'

const ids = ['4kN7pQ2xR8mB5vLw', '4kN7pQ2xR8mB5vLx']
ids.sort(compareZeroIds)
```

## API

### `zeroId()`

Generates a new zeroId.

**Returns:** `string` - A 16-character unique identifier

### `decodeZeroId(id: string)`

Decodes a zeroId to extract its timestamp.

**Parameters:**

- `id` - The zeroId to decode

**Returns:** `{ timestamp: number, createdAt: Date } | null`

### `isValidZeroId(id: string)`

Validates a zeroId format.

**Parameters:**

- `id` - The string to validate

**Returns:** `boolean`

### `compareZeroIds(a: string, b: string)`

Compares two zeroIds chronologically.

**Parameters:**

- `a` - First zeroId
- `b` - Second zeroId

**Returns:** `number` - `-1` if a < b, `1` if a > b, `0` if equal

**Throws:** Error if either ID is invalid

## Format

Each zeroId consists of:

- **9 characters** - Timestamp encoded in base62
- **7 characters** - Random data for uniqueness

Total: **16 characters** of base62 (0-9, A-Z, a-z)

Example: `4kN7pQ2xR8mB5vLw`

## License

MIT © [Lasse Vestergaard](https://github.com/lassejlv)
