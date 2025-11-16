# @overdrip/cli

Command-line interface for setting up and managing Overdrip plant watering devices on Raspberry Pi.

## Installation

**Production Build:**

```bash
export GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
export GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_id

# Build standalone executable (lib/overdrip)
bun run build
```

## Commands

### `overdrip setup`

Sets up a new device with Google OAuth authentication.

```bash
overdrip setup
```

**What it does:**

1. Checks for existing device credentials
2. For existing devices: asks to confirm current name or change it
3. For new devices: prompts for device name
4. Starts local OAuth server and opens Google sign-in in browser
5. Handles OAuth callback with PKCE security
6. Exchanges Google ID token for Firebase authentication
7. Calls `setupDevice` Cloud Function with user authentication
8. Generates and stores long-lived auth code locally

### `overdrip start`

Starts device operations (sensor data collection, configuration sync).

```bash
overdrip start
```

**What it does:**

1. Loads stored authentication credentials
2. Authenticates with Firebase using custom token
3. Begins device runtime operations (TODO: implementation)

## Build System

The CLI uses Bun's build (bundle) feature to create executables with environment variable inlining for production builds.

### Build Commands

The CLI includes a custom build script (`build.ts`) that:

```bash
Overdrip CLI Build Tool

Usage:
  bun run build.ts [options] <command>

Options:
  -h, --help    Show this help message

Commands:
  build         Build Overdrip CLI (default)
  clean         Remove build artifacts
  help          Show this help message
```

### Technology Stack

- **Bun** - Runtime, package manager, and build system
- **clerc** - Command-line argument parsing
- **Ink** - React-based terminal UI components
- **@overdrip/core** - Shared Firebase config and schemas
- **PKCE + Client Secret OAuth** - Desktop application OAuth with enhanced security

## Files

```bash
src/
├── cli.ts                    # CLI entry point and commands
├── app.tsx                   # Main Ink app router
├── oauth.ts                  # PKCE OAuth utilities
├── oauth-server.ts           # Local OAuth callback server
├── oauth-setup.ts            # Complete OAuth setup flow
└── components/
    ├── config-show-scree.tsx  # Display config
    ├── layout.tsx             # Shared UI layout
    ├── oauth-setup-screen.tsx # OAuth setup UI
    └── start-screen.tsx       # Device start UI
```

## Development

### Running Locally

```bash
# Development with .env file
bun run dev
```

### Environment Setup

1. Create `.env` file in CLI package directory (`packages/cli/.env`):

   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
   ```

2. Set up Google OAuth in Google Cloud Console:
   - Application type: Desktop application
   - Authorized redirect URIs: `http://localhost:8080/callback`, `http://localhost:8081/callback`, etc.

## Current Status

✅ **Complete (Phase 1):**

- OAuth-based authentication with PKCE security
- Device name prompting and re-authentication support
- Local OAuth server with proper security validation
- Environment variable build-time inlining
- New `setupDevice` Cloud Function
- React-based terminal UI with progress indicators
- Automatic browser opening with fallback URL display

🔄 **In Progress:**

- Runtime device operations (`start` command implementation)
- Sensor data collection and sync
- Configuration management

📋 **TODO:**

- Device reset/logout command
- Device info/status command
- Error recovery and retry logic
- Cross-platform testing (macOS, Linux, Windows via WSL)
