import { signInWithCustomToken } from "firebase/auth/web-extension";
import { auth } from "@overdrip/core/firebase";
import {
  type DeviceConfig,
  loadDeviceConfig,
  saveDeviceConfig,
  createMinimalDeviceConfig,
  deviceConfigExists,
  getDeviceConfigPath
} from "@overdrip/core/device-config";
import { loadConfig } from "./config";

/**
 * Device Authentication Manager for Hybrid Auth
 *
 * Uses the shared device configuration and long-lived auth codes that are
 * exchanged for Firebase custom tokens on startup.
 */
export class DeviceAuth {
  private config: DeviceConfig | null = null;

  constructor() {
    // Config will be loaded lazily when first accessed
  }

  /**
   * Authenticate with Firebase on startup
   * Call this once when the process starts
   */
  async authenticate(): Promise<void> {
    await this.ensureConfigLoaded();

    if (!this.config) {
      throw new Error("Device not set up. Run 'overdrip setup' first.");
    }

    try {
      // Exchange auth code for fresh Firebase custom token
      const customToken = await this.getCustomToken();

      // Sign into Firebase - Firebase handles all refresh from here
      await signInWithCustomToken(auth, customToken);

      console.log(`✓ Authenticated device: ${this.config.deviceName} (${this.config.deviceId})`);
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
    if (!this.config) {
      throw new Error("No device configuration available");
    }

    const cliConfig = loadConfig();
    const functionUrl = cliConfig.firebaseFunctionsUrl ||
      'https://refreshdevicetoken-h356ephhyq-uc.a.run.app';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authCode: this.config.authCode,
        deviceId: this.config.deviceId
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
   * Store device configuration after initial setup
   */
  async storeInitialTokens(authCode: string, deviceId: string, deviceName: string): Promise<void> {
    this.config = createMinimalDeviceConfig(deviceId, deviceName, authCode);
    await saveDeviceConfig(this.config);
  }

  /**
   * Check if device is set up
   */
  async isSetup(): Promise<boolean> {
    return await deviceConfigExists();
  }

  /**
   * Get device info for display purposes
   */
  async getDeviceInfo(): Promise<{ deviceId: string; deviceName: string } | null> {
    await this.ensureConfigLoaded();
    if (!this.config) return null;
    return {
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName
    };
  }

  /**
   * Clear device configuration (logout)
   */
  async logout(): Promise<void> {
    this.config = null;
    try {
      await Bun.write(getDeviceConfigPath(), ''); // Clear the file
    } catch {
      // File might not exist
    }
    await auth.signOut();
  }

  /**
   * Ensure config is loaded (lazy loading)
   */
  private async ensureConfigLoaded(): Promise<void> {
    if (this.config === null) {
      try {
        this.config = await loadDeviceConfig();
      } catch {
        this.config = null;
      }
    }
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
