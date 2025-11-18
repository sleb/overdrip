# @overdrip/core

Shared platform-agnostic code for the Overdrip plant watering system.

## Purpose

This package provides common functionality used across all packages (CLI, web app, and Cloud Functions):

- **Centralized Firebase configuration**
- **Firebase client SDK initialization**
- **Type-safe API contracts** (Zod schemas)

## Exports

### Config (`@overdrip/core/config`)

```typescript
import { getFirebaseConfig, FUNCTIONS_URL } from "@overdrip/core/config";

const config = getFirebaseConfig();
// Returns Firebase config object with apiKey, projectId, etc.

const url = FUNCTIONS_URL;
// Cloud Functions URL for API calls
```

### Firebase Client SDK (`@overdrip/core/firebase`)

```typescript
import { auth, db, functions } from "@overdrip/core/firebase";

// Initialized Firebase services
auth      // Firebase Authentication
db        // Firestore
functions // Cloud Functions client
```

### Type-Safe Schemas (`@overdrip/core/schemas`)

Zod schemas for validating API requests and responses:

```typescript
import {
  CreateDeviceResponse,
  CreateDeviceResponseSchema,
  RegisterDeviceRequest,
  RegisterDeviceRequestSchema,
  RegisterDeviceResponse,
  RegisterDeviceResponseSchema,
} from "@overdrip/core/schemas";

// Use schemas for validation
const response = CreateDeviceResponseSchema.parse(data);

// Use types for TypeScript
const request: RegisterDeviceRequest = {
  code: "A3K9-PL2M",
  deviceName: "Office Fern",
};
```

**Available Schemas:**
- `CreateDeviceResponse` - Device creation response from Cloud Function
- `RegisterDeviceRequest` - Device registration request payload
- `RegisterDeviceResponse` - Device registration response

## Usage

This package is used internally by other Overdrip packages. It's not meant to be installed standalone.

In the monorepo, packages import using workspace resolution:

```json
{
  "dependencies": {
    "@overdrip/core": "workspace:*"
  }
}
```

## Files

- `src/config.ts` - Firebase configuration
- `src/firebase.ts` - Firebase SDK initialization
- `src/schemas.ts` - Zod schemas for type safety
