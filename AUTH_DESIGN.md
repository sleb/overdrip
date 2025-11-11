# New Authentication Design: Google OAuth Flow

## Overview

This document outlines the new authentication flow for Overdrip that replaces the current registration code system with a direct Google OAuth integration in the CLI. This eliminates the need for users to manually register devices through the web app.

## Current vs New Flow Comparison

### Current Flow (Registration Codes)

1. `overdrip setup` → CLI calls `createDevice` → gets custom token + registration code
2. User manually visits web app, signs in with Google
3. User enters registration code to link device to account
4. Device is now registered and functional

### New Flow (Direct Google OAuth)

1. `overdrip setup` → CLI prompts for device name, starts local server + opens Google OAuth URL
2. User authenticates with Google → redirect to localhost
3. CLI exchanges Google ID token for Firebase tokens using PKCE
4. CLI calls `setupDevice` function with user authentication and device name
5. Device is immediately registered and functional
6. `overdrip start` uses stored tokens for runtime operations

## Detailed New Flow

### 1. Setup Command (`overdrip setup`)

**CLI Process:**

1. Check if device already exists (stored tokens) and prompt for device name:
   - If existing device: "Current device name: {name}. Keep this name? (Y/n)"
   - If new device: "Enter device name (default: Plant Monitor):"
2. Generate PKCE parameters:
   - `code_verifier`: Random 128-character string
   - `code_challenge`: Base64URL-encoded SHA256 hash of verifier
   - `state`: Secure random state parameter
3. Start local HTTP server on available port (8080 or next available)
4. Construct Google OAuth URL with:
   - `client_id`: From `.env` file
   - `redirect_uri`: `http://localhost:{port}/callback`
   - `scope`: `openid email profile`
   - `response_type`: `code`
   - `state`: Generated state parameter
   - `code_challenge`: Generated challenge
   - `code_challenge_method`: `S256`
5. Display OAuth URL in terminal and optionally open in default browser
6. Wait for OAuth callback on local server

**OAuth Callback Process:**

1. Local server receives GET request to `/callback` with:
   - `code`: Authorization code from Google
   - `state`: State parameter (validate matches)
2. Exchange authorization code for Google ID token using PKCE:

   ```http
   POST https://oauth2.googleapis.com/token
   Content-Type: application/x-www-form-urlencoded

   client_id={client_id}&
   code={authorization_code}&
   grant_type=authorization_code&
   redirect_uri=http://localhost:{port}/callback&
   code_verifier={code_verifier}
   ```

3. Extract `id_token` from response
4. Shutdown local server

**Firebase Authentication:**

1. Use Google ID token to sign in to Firebase:

   ```typescript
   import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";

   const credential = GoogleAuthProvider.credential(idToken);
   const userCredential = await signInWithCredential(auth, credential);
   ```

2. Get Firebase ID token from authenticated user
3. Call `setupDevice` Cloud Function with Firebase authentication

### 2. SetupDevice Cloud Function

**New Function:** `setupDevice` (replaces `createDevice`)

**Input:**

- Authenticated Firebase user (from Google OAuth)
- `deviceName`: User-provided device name
- Optional `deviceId` parameter (for re-authentication)

**Process:**

1. Validate user is authenticated (throw `unauthenticated` if not)
2. Generate device ID:
   - If `deviceId` provided: validate format and uniqueness
   - If not provided: generate random UUID
3. Create custom Firebase token for the device ID
4. Store device registration:
   ```typescript
   // Link device to user account immediately
   await db
     .collection("users")
     .doc(userId)
     .collection("devices")
     .doc(deviceId)
     .set({
       name: deviceName,
       registeredAt: new Date(),
       setupMethod: "google_oauth",
     });
   ```

**Response:**

```typescript
{
  deviceId: string;
  customToken: string;
}
```

### 3. Token Storage

**CLI stores:**

```typescript
interface AuthTokens {
  deviceId: string;
  customToken: string;
  deviceName: string;
}
```

**Storage location:** `~/.overdrip/auth.json`

### 4. Start Command (`overdrip start`)

**New Command:** Runtime operation command

**Process:**

1. Load stored tokens from `~/.overdrip/auth.json`
2. Authenticate with Firebase using custom token:
   ```typescript
   const userCredential = await signInWithCustomToken(auth, customToken);
   ```
3. Begin device runtime operations:
   - Push sensor data to Firestore
   - Pull configuration updates
   - Maintain heartbeat/presence

## Implementation Plan

### Phase 1: Core OAuth Infrastructure ✅ COMPLETE

- [x] Add Google OAuth client configuration to Firebase project
- [x] Create local server implementation for OAuth callback
- [x] Implement Google token exchange logic with PKCE
- [x] Create `setupDevice` Cloud Function
- [x] Build system with environment variable inlining
- [x] OAuth utilities (PKCE, token exchange, ID token parsing)
- [x] Local OAuth server with security validation
- [x] Configuration management with build-time validation

### Phase 2: CLI Integration ✅ COMPLETE

- [x] Modify `setup` command to use new OAuth flow
- [x] Update token storage format and validation
- [x] Add `start` command for runtime operations
- [x] Update error handling and user feedback
- [x] React-based terminal UI with Ink
- [x] Device name prompting and re-authentication support
- [x] Progress indicators and browser opening
- [x] Standalone executable compilation

### Phase 3: Cleanup & Testing 📋 TODO

- [ ] Remove old `createDevice` function and registration code system
- [ ] Clean up Firestore rules (remove registration-codes collection)
- [ ] Remove scheduled cleanup function
- [ ] Deploy new `setupDevice` function
- [ ] Add comprehensive testing
- [ ] Test end-to-end OAuth flow with real Google OAuth

### Phase 4: Runtime Operations 📋 TODO

- [ ] Implement device sensor data collection
- [ ] Add configuration sync from Firestore
- [ ] Implement heartbeat/presence system
- [ ] Add device status reporting
- [ ] Error recovery and retry logic

### Phase 5: Documentation ✅ COMPLETE

- [x] Update README with new flow
- [x] Update CLI help text
- [x] Create troubleshooting guide
- [x] Document build system and deployment

## Security Considerations

### OAuth Security

- **State Parameter**: Prevents CSRF attacks during OAuth flow
- **PKCE (Proof Key for Code Exchange)**: Required for public clients, eliminates need for client secret
- **Redirect URI Validation**: Ensure redirect_uri exactly matches registered URI
- **Code Verifier Security**: Generate cryptographically secure 128-character random string

### Local Server Security

- **Port Binding**: Bind only to localhost (127.0.0.1)
- **Request Validation**: Validate all incoming requests strictly
- **Timeout**: Automatically shutdown server after reasonable timeout
- **State Validation**: Verify state parameter matches sent value

### Token Storage

- **File Permissions**: Store auth.json with 0600 permissions (owner read/write only)
- **Secure Deletion**: Securely wipe tokens on logout/reset

## Error Handling

### OAuth Errors

- **User Cancellation**: Clear messaging when user cancels OAuth
- **Invalid Grant**: Handle expired/invalid authorization codes
- **Network Issues**: Retry logic for token exchange
- **Port Conflicts**: Fallback to alternative ports

### Firebase Errors

- **Authentication Failures**: Clear error messages for auth failures
- **Permission Denied**: Handle insufficient permissions gracefully
- **Network Connectivity**: Retry logic with exponential backoff

### CLI UX Improvements

- **Progress Indicators**: Show clear progress through setup steps
- **Error Recovery**: Provide actionable error messages and recovery steps
- **Validation**: Validate environment and prerequisites before starting

## Configuration Requirements

### Environment Configuration

```bash
# .env file
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.googleusercontent.com
```

### Google Cloud Console Setup

1. Enable Google+ API for the project
2. Configure OAuth 2.0 credentials:
   - Application type: Desktop application
   - Authorized redirect URIs: `http://localhost:8080/callback`, `http://localhost:8081/callback`, etc.
   - No client secret needed (PKCE eliminates this requirement)

## Migration Strategy

### Breaking Changes Approach

Since this is still in active development, we'll implement breaking changes:

### Migration Steps

1. [x] Replace `createDevice` with `setupDevice` function (implemented)
2. [x] Update CLI to use new OAuth flow (implemented)
3. [ ] Deploy new `setupDevice` function to production
4. [ ] Remove old `createDevice` function
5. [ ] Remove registration code system entirely
6. [ ] Clean up Firestore rules and scheduled functions
7. [ ] Remove old authentication logic and schemas

## Testing Strategy

### Unit Tests

- OAuth URL generation and validation
- Token exchange logic
- Local server request handling
- Error handling scenarios

### Integration Tests

- End-to-end OAuth flow
- Firebase authentication integration
- Cloud Function interaction
- Token storage and retrieval

### Manual Testing

- Cross-platform compatibility (macOS, Linux, Windows via WSL)
- Network failure scenarios
- User cancellation flows
- Port conflict handling

## Benefits of New Flow

### User Experience

- **Simplified Setup**: Single command setup without web app interaction
- **Familiar OAuth**: Users already familiar with Google sign-in
- **Immediate Registration**: Device registered instantly upon setup
- **Custom Device Names**: Users can name their devices during setup
- **Re-authentication Support**: Existing devices can re-authenticate while preserving or updating names

### Developer Experience

- **Reduced Complexity**: No registration code management or client secrets
- **Better Security**: PKCE-based OAuth flow more secure than registration codes
- **Cleaner Architecture**: Eliminates temporary registration state
- **Environment-based Config**: Simple `.env` configuration
- **Type Safety**: Simplified schemas and error handling

### Operational Benefits

- **No Code Cleanup**: Eliminates scheduled cleanup functions
- **Reduced Storage**: No temporary registration codes in Firestore
- **Better Monitoring**: Clearer authentication flow tracking
- **Easier Debugging**: Direct authentication path easier to debug

## Potential Risks & Mitigations

### Risk: OAuth Complexity

**Mitigation**: Comprehensive error handling and clear user guidance

### Risk: Local Server Security

**Mitigation**: Strict localhost binding and request validation

### Risk: Token Management

**Mitigation**: Secure storage with proper file permissions

### Risk: Network Dependencies

**Mitigation**: Retry logic and offline capability where possible

### Risk: Platform Compatibility

**Mitigation**: Thorough cross-platform testing and fallbacks
