# Zero ID

A compact, time-sortable unique identifier for JavaScript and TypeScript.

## Installation

```bash
npm install zero-id
```

## Usage

```typescript
import { zeroId, decodeZeroId, isValidZeroId, compareZeroIds } from 'zero-id'

// Basic
const id = zeroId()
// => "4kN7pQ2xR8mB5vLw"

// With prefix
const userId = zeroId({ prefix: "user_" })
// => "user_4kN7pQ2xR8mB5vLw"

// With metadata
const orderId = zeroId({ 
  prefix: "order_",
  metadata: { amount: 99.99, currency: "USD" }
})

// Decode
const decoded = decodeZeroId(orderId, "order_")
// => { timestamp: 1634567890123, createdAt: Date(...), metadata: { amount: 99.99, currency: "USD" } }

// Validate
isValidZeroId(id) // => true
isValidZeroId(userId, "user_") // => true

// Compare (for sorting)
ids.sort(compareZeroIds)
```

## Options

```typescript
zeroId({
  prefix: "user_",      // Optional prefix
  randomLength: 7,      // Random part length (default: 7)
  metadata: { ... }     // Optional metadata object
})
```

## Format

- **9 characters** - Timestamp (base62 encoded)
- **Variable** - Metadata (if provided)
- **7 characters** - Random data (configurable)

Base62 encoding (0-9, A-Z, a-z) - URL-safe, no special characters.

## License

MIT