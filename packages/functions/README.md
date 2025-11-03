# Overdrip Firebase Functions

Backend Cloud Functions for device authentication, registration, and maintenance.

## Build System

This package is built with **Bun** but deployed to **Node.js** runtime:

```bash
bun install
bun run build  # Bundles to lib/ directory with Node.js target
```

The build process uses Bun's bundler to create Node.js-compatible CommonJS modules, bundling dependencies to avoid npm workspace protocol issues during deployment.

## Cloud Functions

### createDevice

Creates a new device with a custom authentication token and registration code.

**Type:** HTTP Request (`onRequest`)

**Endpoint:** `POST /createDevice`

**Request:** None required

**Response:**
```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "customToken": "eyJhbGc...",
  "registrationCode": "A3K9-PL2M"
}
```

**What it does:**
1. Generates unique device ID (UUID)
2. Creates Firebase custom token for that device ID
3. Generates 8-character registration code (format: `XXXX-XXXX`)
4. Stores registration code in `/registration-codes/{code}` with `deviceId` and `createdAt`
5. Returns all three values to CLI

**Code location:** `src/index.ts:32-77`

---

### registerDevice

Links a device to a user account using a registration code.

**Type:** Callable Function (`onCall`)

**Request:**
```typescript
{
  code: string;        // Registration code (e.g., "A3K9-PL2M")
  deviceName: string;  // Optional device name (defaults to "Plant Monitor")
}
```

**Response:**
```json
{
  "success": true,
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
- `unauthenticated` - User not logged in
- `invalid-argument` - Invalid request data
- `not-found` - Registration code doesn't exist
- `deadline-exceeded` - Registration code expired (>24 hours old)

**What it does:**
1. Validates user authentication
2. Looks up registration code in Firestore
3. Checks code exists and hasn't expired (24 hour window)
4. Creates `/users/{userId}/devices/{deviceId}` with device name and metadata
5. Deletes one-time registration code
6. Returns success and device ID

**Code location:** `src/index.ts:82-135`

---

### cleanupExpiredCodes

Scheduled function that automatically deletes expired registration codes.

**Type:** Scheduled Function (`onSchedule`)

**Schedule:** Daily at 3 AM UTC (`0 3 * * *`)

**What it does:**
1. Queries `/registration-codes` collection for codes older than 24 hours
2. Batch deletes all expired codes
3. Logs deletion count with structured data for Cloud Monitoring

**Structured logging:**
```typescript
info("Registration code cleanup completed", {
  deletedCount: number,
  metric: "registration_codes_cleanup"
});
```

This log output is used by Google Cloud Monitoring to populate the `registration_codes_deleted` metric.

**Code location:** `src/index.ts:141-184`

---

## Type Safety

All functions use shared Zod schemas from `@overdrip/core/schemas` for request/response validation:

- `CreateDeviceResponse` - Validated before sending response
- `RegisterDeviceRequest` - Validated from incoming request
- `RegisterDeviceResponse` - Validated before returning

Example:
```typescript
const validationResult = RegisterDeviceRequestSchema.safeParse(req.data);
if (!validationResult.success) {
  throw new HttpsError("invalid-argument", "Invalid request data");
}
```

## Development

```bash
# Build TypeScript with Bun bundler
bun run build

# Deploy to Firebase
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createDevice

# View logs
firebase functions:log
```

## Deployment Notes

- Only the `lib/` directory is deployed (source files in `src/` are excluded via `.gcloudignore`)
- Dependencies are bundled at build time, so only Firebase SDKs need to be installed on the server
- Firebase Cloud Build runs `npm install` for runtime dependencies only (`firebase-admin`, `firebase-functions`)

## Monitoring

Metrics, dashboards, and alerts are managed via Terraform. See [../../infrastructure/README.md](../../infrastructure/README.md) for details.
