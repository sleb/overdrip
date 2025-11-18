import { loadDeviceConfig, saveDeviceConfig } from "@overdrip/core/device-config";
import { auth, functions } from "@overdrip/core/firebase";
import {
  SetupDeviceRequestSchema,
  SetupDeviceResponseSchema,
  type SetupDeviceResponse
} from "@overdrip/core/schemas";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { version } from "../package.json";
import { buildOAuthURL, exchangeCodeForTokens, generatePKCEChallenge } from "./oauth";
import { OAuthServer } from "./oauth-server";

export interface SetupProgress {
  step: string;
  details?: string;
}

export interface SetupResult {
  deviceId: string;
  deviceName: string;
  isReauth: boolean;
}

export interface OauthConfig {
  oAuthClientId: string;
  oAuthClientSecret: string;
}

/**
 * Create configuration from provided values
 * This is the core logic separated from the environment variable source
 */
export const createConfig = (
  oAuthClientId: string,
  oAuthClientSecret: string,
): OauthConfig => {
  if (!oAuthClientId || !oAuthClientSecret) {
    throw new Error("Invalid configuration: OAuth client ID and secret cannot be empty.");
  }

  return {
    oAuthClientId: oAuthClientId,
    oAuthClientSecret: oAuthClientSecret,
  };
};

// At build time, Bun will inline these environment variables
// Development: loaded from .env file in CLI package
// Production: inlined via --define flags during build
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;

/**
 * Load configuration from environment variables
 * Values are captured at module load time for build-time inlining
 */
export const loadGoogleOauthConfig = (): OauthConfig => {
  return createConfig(
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
  );
};

/**
 * Complete OAuth-based device setup flow
 */
export const oauthSetupDevice = async (
  deviceName: string,
  onProgress: (progress: SetupProgress) => void
): Promise<SetupResult> => {
  onProgress({ step: "initializing" });

  // Load configuration
  const config = loadGoogleOauthConfig();

  // Check if this is a re-authentication
  const existingDeviceInfo = await loadDeviceConfig();
  const isReauth = !!existingDeviceInfo;

  onProgress({ step: "starting_oauth_server" });

  // Find available port and start OAuth server
  const port = await OAuthServer.findAvailablePort(8080);
  const redirectUri = OAuthServer.getRedirectUri(port);

  // Generate PKCE challenge
  const pkceChallenge = generatePKCEChallenge();

  // Build OAuth URL
  const oauthUrl = buildOAuthURL(
    config.oAuthClientId,
    redirectUri,
    pkceChallenge
  );

  onProgress({
    step: "waiting_for_auth",
    details: oauthUrl
  });

  // Start OAuth server and wait for callback
  const oauthServer = new OAuthServer();
  let callbackResult;

  try {
    callbackResult = await oauthServer.start({
      port,
      expectedState: pkceChallenge.state,
      timeout: 5 * 60 * 1000, // 5 minutes
    });
  } catch (error) {
    oauthServer.stop();
    throw new Error(`OAuth flow failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  onProgress({ step: "exchanging_tokens" });

  // Exchange authorization code for tokens
  let tokenResponse;
  try {
    tokenResponse = await exchangeCodeForTokens(
      config.oAuthClientId,
      redirectUri,
      callbackResult.code,
      pkceChallenge.codeVerifier,
      config.oAuthClientSecret
    );
  } catch (error) {
    throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  onProgress({ step: "authenticating_firebase" });

  // Authenticate with Firebase using Google ID token
  let firebaseUser;
  try {
    const credential = GoogleAuthProvider.credential(tokenResponse.id_token);
    const userCredential = await signInWithCredential(auth, credential);
    firebaseUser = userCredential.user;
  } catch (error) {
    throw new Error(`Firebase authentication failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  onProgress({ step: "setting_up_device" });

  // Call setupDevice Cloud Function
  let setupResponse: SetupDeviceResponse;
  try {
    setupResponse = await callSetupDeviceFunction(
      deviceName,
      existingDeviceInfo?.deviceId // Pass existing device ID for re-auth
    );
  } catch (error) {
    throw new Error(`Device setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  onProgress({ step: "storing_credentials" });

  // Store authentication tokens
  const now = new Date();
  await saveDeviceConfig({
    deviceId: setupResponse.deviceId,
    deviceName,
    authCode: setupResponse.authCode,
    customTokenUrl: "https://us-central1-overdrip-ed767.cloudfunctions.net/refreshDeviceToken",
    setupAt: now,
    setupVersion: version,
    lastModified: now,

  });

  onProgress({ step: "complete" });

  return {
    deviceId: setupResponse.deviceId,
    deviceName,
    isReauth,
  };
};

/**
 * Call the setupDevice Cloud Function
 */
const callSetupDeviceFunction = async (
  deviceName: string,
  deviceId?: string
): Promise<SetupDeviceResponse> => {
  // Prepare request data - only include deviceId if it has a value
  const requestData: any = { deviceName };
  if (deviceId) {
    requestData.deviceId = deviceId;
  }

  // Validate the request data
  const validatedData = SetupDeviceRequestSchema.parse(requestData);

  // Call the setupDevice Cloud Function
  const setupDevice = httpsCallable(functions, 'setupDevice');

  try {
    const result = await setupDevice(validatedData);
    return SetupDeviceResponseSchema.parse(result.data);
  } catch (error: any) {
    // Handle Firebase Functions errors
    const errorMessage = error.message || error.code || 'Unknown error';
    throw new Error(`Setup device failed: ${errorMessage}`);
  }
};

/**
 * Open URL in default browser (cross-platform)
 */
export const openBrowser = async (url: string): Promise<boolean> => {
  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      await Bun.$`open ${url}`;
    } else if (platform === 'win32') {
      await Bun.$`start ${url}`;
    } else {
      // Linux and others
      await Bun.$`xdg-open ${url}`;
    }

    return true;
  } catch (error) {
    // Browser opening failed, user will need to copy/paste URL
    return false;
  }
};
