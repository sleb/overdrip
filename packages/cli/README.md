# @overdrip/cli

Command-line interface for setting up and managing Overdrip plant watering devices on Raspberry Pi.

## Installation

**From source (development):**

```bash
cd packages/cli
bun install
bun run src/cli.ts
```

**TODO:** Package as standalone binary for production use

## Commands

### `overdrip setup`

Sets up a new device and generates a registration code.

```bash
overdrip setup
```

**What it does:**
1. Calls the `createDevice` Cloud Function
2. Function generates device ID, custom token, and registration code
3. Function stores registration code in Firestore with 24-hour expiration
4. CLI authenticates with Firebase using custom token
5. CLI stores credentials locally at `~/.overdrip/auth.json`
6. Displays registration code for user to enter on web app

**Example output:**
```
┌─────────────────────────────────────┐
│ Device Setup Complete!              │
│                                     │
│ Register this device:               │
│  1. Visit: https://overdrip.web.app │
│  2. Enter code: A3K9-PL2M           │
│                                     │
│ Device ID: aBc123XyZ                │
└─────────────────────────────────────┘
```

## Architecture

The CLI uses:
- **clerc** - Command-line argument parsing
- **Ink** - React-based terminal UI components
- **@overdrip/core** - Shared Firebase config and schemas
- **Bun** - Runtime and package manager (with Bun-specific APIs)

## Stored Data

Credentials are stored locally at `~/.overdrip/auth.json`:

```json
{
  "deviceId": "aBc123XyZ",
  "refreshToken": "...",
  "registrationCode": "A3K9-PL2M"
}
```

**Permissions:** File is created with mode `0600` (readable/writable by owner only)

## Files

- `src/cli.ts` - CLI entry point and command definitions
- `src/app.tsx` - Ink UI components for setup flow
- `src/setup.tsx` - Setup command logic
- `src/auth.ts` - Credential storage using Bun file APIs
- `src/components/` - Reusable Ink UI components

## Development

Run the CLI directly:

```bash
bun run src/cli.ts setup
```

## Current Status

✅ **Complete:**
- Setup command with full device registration flow
- Credential storage with secure file permissions
- Interactive terminal UI with Ink

🔄 **TODO:**
- Credential loading and session restoration
- Runtime operation mode (sensor reading, data sync)
- Device reset command
- Device info/status command
- Package as standalone binary for easy deployment

## Authentication Flow

1. CLI calls `createDevice` Cloud Function (no auth required)
2. Function returns `{ deviceId, customToken, registrationCode }`
3. CLI signs in with custom token: `signInWithCustomToken(auth, customToken)`
4. Firebase returns refresh token
5. CLI stores `deviceId`, `refreshToken`, and `registrationCode` locally
6. On subsequent runs, CLI will use stored refresh token for automatic authentication
