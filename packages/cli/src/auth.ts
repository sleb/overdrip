import os from "node:os";
import path from "node:path";
import { write } from "bun";
import { unlink } from "node:fs/promises";
import { signInWithCustomToken } from "firebase/auth/web-extension";
import { auth } from "@overdrip/core/firebase";
import { ClientAuthTokensSchema, type ClientAuthTokens } from "@overdrip/core/schemas";
import { loadConfig } from "./config";

/**
 * Device Authentication Manager for Hybrid Auth
 *
 * Uses long-lived auth codes that are exchanged for Firebase custom tokens on startup.
 * Firebase handles all token management during runtime.
 */
export class DeviceAuth {
  private tokens: ClientAuthTokens | null = null;

  constructor() {
    this.loadTokens();
  }

  /**
   * Authenticate with Firebase on startup
   * Call this once when the process starts
   */
  async authenticate(): Promise<void> {
    if (!this.tokens) {
      throw new Error("Device not set up. Run 'overdrip setup' first.");
    }

    try {
      // Exchange auth code for fresh Firebase custom token
      const customToken = await this.getCustomToken();

      // Sign into Firebase - Firebase handles all refresh from here
      await signInWithCustomToken(auth, customToken);

      console.log(`✓ Authenticated device: ${this.tokens.deviceName} (${this.tokens.deviceId})`);
    } catch (error) {
      console.error("Authentication failed:", error);
      throw new Error("Authentication failed. Device may need to be re-registered.");
    }
  }

  /**
   * Exchange auth code for Firebase custom token
   * Uses unauthenticated HTTPS endpoint
   */
  private async getCustomToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("No auth tokens available");
    }

    const config = loadConfig();
    const functionUrl = config.firebaseFunctionsUrl ||
      'https://us-central1-overdrip-dev.cloudfunctions.net/refreshDeviceToken';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authCode: this.tokens.authCode,
        deviceId: this.tokens.deviceId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const responseData = await response.json() as { customToken: string };
    const { customToken } = responseData;
    return customToken;
  }

  /**
   * Store auth tokens after initial setup
   */
  async storeInitialTokens(authCode: string, deviceId: string, deviceName: string): Promise<void> {
    this.tokens = {
      authCode,
      deviceId,
      deviceName
    };
    await this.saveTokens();
  }

  /**
   * Check if device is set up
   */
  isSetup(): boolean {
    return this.tokens !== null;
  }

  /**
   * Get device info for display purposes
   */
  getDeviceInfo(): { deviceId: string; deviceName: string } | null {
    if (!this.tokens) return null;
    return {
      deviceId: this.tokens.deviceId,
      deviceName: this.tokens.deviceName
    };
  }

  /**
   * Clear all tokens (logout)
   */
  async logout(): Promise<void> {
    this.tokens = null;
    await this.clearStoredTokens();
    await auth.signOut();
  }

  // Storage methods
  private async loadTokens(): Promise<void> {
    try {
      const authPath = this.getAuthPath();
      const file = Bun.file(authPath);
      if (await file.exists()) {
        const content = await file.text();
        const data = JSON.parse(content);
        this.tokens = ClientAuthTokensSchema.parse(data);
      }
    } catch (error) {
      console.error("Failed to load auth tokens:", error);
      this.tokens = null;
    }
  }

  private async saveTokens(): Promise<void> {
    if (!this.tokens) return;

    const authPath = this.getAuthPath();
    await write(authPath, JSON.stringify(this.tokens), {
      createPath: true,
      mode: 0o600,
    });
  }

  private async clearStoredTokens(): Promise<void> {
    const authPath = this.getAuthPath();
    try {
      await unlink(authPath);
    } catch (error) {
      // File might not exist, ignore
    }
  }

  private getAuthPath(): string {
    return path.join(os.homedir(), ".overdrip", "auth.json");
  }
}

// Global instance
export const deviceAuth = new DeviceAuth();

// Legacy exports for compatibility - these will be removed
export const logIn = async (token: string): Promise<string> => {
  const { user } = await signInWithCustomToken(auth, token);
  return user.refreshToken;
};

export const storeAuthTokens = async (tokens: { deviceId: string; customToken: string; deviceName: string }): Promise<void> => {
  throw new Error("storeAuthTokens is deprecated - use deviceAuth.storeInitialTokens instead");
};

export const loadAuthTokens = async (): Promise<{ deviceId: string; customToken: string; deviceName: string } | null> => {
  throw new Error("loadAuthTokens is deprecated - use deviceAuth.getDeviceInfo instead");
};
