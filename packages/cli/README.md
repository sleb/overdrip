# @overdrip/cli

Command-line interface for setting up and managing Overdrip plant watering devices on Raspberry Pi.

## Installation

**Development:**

```bash
# From workspace root
bun install
bun run cli:dev setup
```

**Production Build:**

```bash
# From workspace root - Set required environment variables
export GOOGLE_OAUTH_CLIENT_ID=your_google_client_id

# Build standalone executable
bun run cli:build:release

# Run the executable
cd packages/cli && ./overdrip setup
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
8. Stores device credentials locally at `~/.overdrip/auth.json`
9. Device is immediately registered and ready to use

**Example flows:**

*New device:*
```
Device Setup
Enter a name for your device (default: Plant Monitor):
> My Garden Sensor

Setting up device: My Garden Sensor
✓ Opened browser for authentication
⠋ Waiting for Google authentication...
```

*Existing device:*
```
Re-authenticating Device
Current device name: My Garden Sensor
Keep this name? Y/n
> [Enter to keep, or 'n' to change]

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

## OAuth Setup

Before using the CLI, you need to configure Google OAuth credentials. This is a one-time setup.

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project: **overdrip-ed767**
3. Navigate to **APIs & Services > Credentials**
4. Click **+ CREATE CREDENTIALS > OAuth 2.0 Client IDs**

Configure the OAuth client:
- **Application type**: `Desktop application`
- **Name**: `Overdrip CLI`
- **Authorized redirect URIs**:
  ```
  http://localhost:8080/callback
  http://localhost:8081/callback
  http://localhost:8082/callback
  http://localhost:8083/callback
  http://localhost:8084/callback
  ```

5. Click **CREATE** and copy the **Client ID** (ignore Client Secret - not needed)

### Step 2: CLI Configuration

Create `.env` file in the CLI package directory:

```bash
# packages/cli/.env
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret  # Required for your Desktop client
```

**Important**: Your specific Desktop application OAuth client requires both client ID and client secret, even though many Desktop apps only need PKCE. This is a valid Google configuration.

### Step 3: Test Setup

Run the CLI setup command to test your OAuth configuration:

```bash
# From workspace root
bun run cli:build
cd packages/cli && ./overdrip setup
```

## Build System

The CLI uses Bun's compile feature to create standalone executables with environment variable inlining for production builds.

### Development Builds

Use `.env` file in CLI package directory for configuration:

```bash
# From workspace root
bun run cli:build      # Compile executable for development
```

### Production Builds

Environment variables are inlined at build time:

```bash
# From workspace root
export GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.googleusercontent.com
export GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
bun run cli:build:release  # Compile executable with inlined env vars
```

### Build Commands

```bash
# All commands run from workspace root
bun run cli:dev           # Run CLI directly (development)
bun run cli:build         # Compile executable (development)
bun run cli:build:release # Compile executable (production, requires env vars)
bun run cli:clean         # Remove build artifacts
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
- **PKCE + Client Secret OAuth** - Desktop application OAuth with enhanced security

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
# From workspace root - Development with .env file
bun run cli:dev setup

# Direct execution from workspace root
bun packages/cli/src/cli.ts setup
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

### Testing OAuth Flow

Test the OAuth setup by running the actual CLI setup command:

```bash
# From workspace root
bun run cli:build
cd packages/cli && ./overdrip setup
```

The OAuth flow requires:
- Interactive terminal (raw mode support)
- Network access to Google OAuth endpoints
- Available port on localhost (8080+ range)
- Default browser available for opening OAuth URL
- GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET set in packages/cli/.env file

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
- For development: Add to `packages/cli/.env` file
- For production: Set environment variables before building

**"Token exchange failed: invalid_request"**
- Your Desktop OAuth client requires a client secret
- Add `GOOGLE_OAUTH_CLIENT_SECRET` to your `.env` file
- This is normal for some Desktop application configurations

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
