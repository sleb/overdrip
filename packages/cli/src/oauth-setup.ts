import { signInWithCredential, GoogleAuthProvider } from "firebase/auth/web-extension";
import { auth } from "@overdrip/core/firebase";
import { FUNCTIONS_URL } from "@overdrip/core/config";
import {
  SetupDeviceRequestSchema,
  SetupDeviceResponseSchema,
  SetupDeviceErrorSchema,
  type SetupDeviceResponse,
} from "@overdrip/core/schemas";
import { loadConfig } from "./config";
import { generatePKCEChallenge, buildOAuthURL, exchangeCodeForTokens } from "./oauth";
import { OAuthServer } from "./oauth-server";
import { storeAuthTokens, loadAuthTokens } from "./auth";

export interface SetupProgress {
  step: string;
  details?: string;
}

export interface SetupResult {
  deviceId: string;
  deviceName: string;
  isReauth: boolean;
}

/**
 * Complete OAuth-based device setup flow
 */
export async function oauthSetupDevice(
  deviceName: string,
  onProgress: (progress: SetupProgress) => void
): Promise<SetupResult> {
  onProgress({ step: "initializing" });

  // Load configuration
  const config = loadConfig();

  // Check if this is a re-authentication
  const existingTokens = await loadAuthTokens();
  const isReauth = !!existingTokens;

  onProgress({ step: "starting_oauth_server" });

  // Find available port and start OAuth server
  const port = await OAuthServer.findAvailablePort(8080);
  const redirectUri = OAuthServer.getRedirectUri(port);

  // Generate PKCE challenge
  const pkceChallenge = generatePKCEChallenge();

  // Build OAuth URL
  const oauthUrl = buildOAuthURL(
    config.googleOAuthClientId,
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
      config.googleOAuthClientId,
      redirectUri,
      callbackResult.code,
      pkceChallenge.codeVerifier
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
      existingTokens?.deviceId // Pass existing device ID for re-auth
    );
  } catch (error) {
    throw new Error(`Device setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  onProgress({ step: "storing_credentials" });

  // Store authentication tokens
  await storeAuthTokens({
    deviceId: setupResponse.deviceId,
    customToken: setupResponse.customToken,
    deviceName,
  });

  onProgress({ step: "complete" });

  return {
    deviceId: setupResponse.deviceId,
    deviceName,
    isReauth,
  };
}

/**
 * Call the setupDevice Cloud Function
 */
async function callSetupDeviceFunction(
  deviceName: string,
  deviceId?: string
): Promise<SetupDeviceResponse> {
  // Get Firebase ID token for authentication
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const idToken = await user.getIdToken();

  // Prepare request data
  const requestData = SetupDeviceRequestSchema.parse({
    deviceName,
    deviceId,
  });

  // Make authenticated request to Cloud Function
  const response = await fetch(`${FUNCTIONS_URL}/setupDevice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      data: requestData,
    }),
  });

  const responseData = await response.json() as any;

  if (!response.ok) {
    const errorData = SetupDeviceErrorSchema.parse(responseData);
    throw new Error(errorData.error);
  }

  // Extract result from Cloud Functions response format
  const result = responseData.result || responseData;
  return SetupDeviceResponseSchema.parse(result);
}

/**
 * Open URL in default browser (cross-platform)
 */
export async function openBrowser(url: string): Promise<boolean> {
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
}
