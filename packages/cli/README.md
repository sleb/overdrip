# @overdrip/cli

Command-line interface for setting up and managing Overdrip plant watering devices on Raspberry Pi.

## Installation

**Development:**

```bash
cd packages/cli
bun install
bun run dev setup
```

**Production Build:**

```bash
# Set required environment variables
export GOOGLE_OAUTH_CLIENT_ID=your_google_client_id

# Build standalone executable
bun run build:release

# Run the executable
./overdrip setup
```

## Commands

### `overdrip setup`

Sets up a new device with Google OAuth authentication.

```bash
overdrip setup
```

**What it does:**
1. Prompts for device name (or asks to keep/change existing name for re-auth)
2. Starts local OAuth server and opens Google sign-in in browser
3. Handles OAuth callback with PKCE security
4. Exchanges Google ID token for Firebase authentication
5. Calls `setupDevice` Cloud Function with user authentication
6. Stores device credentials locally at `~/.overdrip/auth.json`
7. Device is immediately registered and ready to use

**Example flow:**
```
Device Setup
Enter a name for your device (default: Plant Monitor):
> My Garden Sensor

Setting up device: My Garden Sensor
✓ Opened browser for authentication
⠋ Waiting for Google authentication...
```

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

The CLI uses Bun's compile feature to create standalone executables with environment variable inlining for production builds.

### Development Builds

Use `.env` file for configuration:

```bash
# .env
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.googleusercontent.com
```

```bash
bun run build          # Compile executable for development
```

### Production Builds

Environment variables are inlined at build time:

```bash
export GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.googleusercontent.com
bun run build:release  # Compile executable with inlined env vars
```

### Build Commands

```bash
bun run dev           # Run CLI directly (development)
bun run build         # Compile executable (development)
bun run build:release # Compile executable (production, requires env vars)
bun run clean         # Remove build artifacts
```

### Custom Build Script

The CLI includes a custom build script (`build.ts`) that:
- Validates required environment variables for production builds
- Handles Bun's `--define` flags for env var inlining
- Provides helpful error messages for missing configuration
- Compiles standalone executables for easy distribution

## Architecture

### OAuth Flow (New)

1. **Device Name Input** - CLI prompts for device name or re-authentication
2. **Local OAuth Server** - Starts server on localhost:8080 (or next available port)
3. **PKCE Security** - Uses Proof Key for Code Exchange (no client secret needed)
4. **Browser Authentication** - Opens Google OAuth in default browser
5. **Token Exchange** - Exchanges authorization code for Google ID token
6. **Firebase Auth** - Uses Google ID token to authenticate with Firebase
7. **Device Registration** - Calls `setupDevice` Cloud Function with user context
8. **Credential Storage** - Stores device ID, custom token, and device name

### Technology Stack

- **Bun** - Runtime, package manager, and build system
- **clerc** - Command-line argument parsing
- **Ink** - React-based terminal UI components
- **@overdrip/core** - Shared Firebase config and schemas
- **PKCE OAuth** - Secure authorization without client secrets

## Stored Data

Credentials are stored locally at `~/.overdrip/auth.json`:

```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "customToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceName": "My Garden Sensor"
}
```

**Security:**
- File created with mode `0600` (owner read/write only)
- Custom tokens are device-scoped and time-limited
- No long-lived refresh tokens stored

## Files

```
src/
├── cli.ts                    # CLI entry point and commands
├── app.tsx                   # Main Ink app router
├── config.ts                 # Environment configuration
├── auth.ts                   # Credential storage and Firebase auth
├── oauth.ts                  # PKCE OAuth utilities
├── oauth-server.ts           # Local OAuth callback server
├── oauth-setup.ts            # Complete OAuth setup flow
└── components/
    ├── layout.tsx            # Shared UI layout
    ├── oauth-setup-screen.tsx # OAuth setup UI
    └── start-screen.tsx      # Device start UI
```

## Development

### Running Locally

```bash
# Development with .env file
bun run dev setup

# Direct execution
bun run src/cli.ts setup
```

### Environment Setup

1. Create `.env` file:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.googleusercontent.com
   ```

2. Set up Google OAuth in Google Cloud Console:
   - Application type: Desktop application
   - Authorized redirect URIs: `http://localhost:8080/callback`, `http://localhost:8081/callback`, etc.

### Testing OAuth Flow

The OAuth flow requires:
- Interactive terminal (raw mode support)
- Network access to Google OAuth endpoints
- Available port on localhost (8080+ range)
- Default browser available for opening OAuth URL

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

## Security Features

- **PKCE OAuth Flow** - No client secrets required or stored
- **State Parameter Validation** - CSRF protection during OAuth
- **Localhost-only Server** - OAuth callback server binds only to 127.0.0.1
- **Token Scoping** - Custom tokens are device-specific
- **Secure Storage** - Credentials stored with restrictive file permissions
- **Build-time Inlining** - Sensitive config baked into binary, not runtime files

## Authentication Comparison

### Old Flow (Registration Codes)
1. CLI → `createDevice` → registration code
2. User manually visits web app
3. User enters registration code
4. Device linked to user account

### New Flow (Direct OAuth)
1. CLI → OAuth flow → immediate device registration
2. No manual web app interaction required
3. Immediate device functionality
4. Better security with PKCE

## Troubleshooting

### Common Issues

**"Configuration error: GOOGLE_OAUTH_CLIENT_ID is required"**
- For development: Add to `.env` file
- For production: Set environment variable before building

**"OAuth flow failed: Token exchange failed"**
- Check Google OAuth client configuration
- Verify redirect URIs include localhost ports
- Ensure network connectivity to Google endpoints

**"Raw mode is not supported"**
- Terminal doesn't support interactive input
- Use in proper terminal environment (not CI/CD)

**"No available ports found"**
- Ports 8080-8089 are all in use
- Close other applications using these ports
- Or wait and retry
