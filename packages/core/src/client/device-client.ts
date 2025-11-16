import { signInWithCustomToken } from "firebase/auth/web-extension";
import { auth } from "../firebase";

export interface DeviceClientOptions {
  authCode: string;
  deviceId: string;
  deviceName: string;
  customTokenUrl: string;
}

/**
 * Main Overdrip Device SDK Client
 *
 * Provides a unified interface for device authentication and cloud operations.
 * Abstracts away Firebase implementation details.
 */
export class OverdripDeviceClient {
  public readonly deviceId: string;
  public readonly deviceName: string;
  private customTokenUrl: string;
  private authCode: string;

  constructor({ deviceId, deviceName, customTokenUrl, authCode }: DeviceClientOptions) {
    this.deviceId = deviceId;
    this.deviceName = deviceName;
    this.customTokenUrl = customTokenUrl;
    this.authCode = authCode;
  }

  /**
   * Authenticate the device with the server
   * Must be called before using other methods
   */
  async authenticate(): Promise<void> {
    try {
      // Exchange auth code for Firebase custom token
      const customToken = await this.getCustomToken(this.authCode, this.deviceId);

      // Sign into Firebase - Firebase handles all refresh from here
      await signInWithCustomToken(auth, customToken);

      console.log(`✓ Device authenticated: ${this.deviceName} (${this.deviceId})`);
    } catch (error) {
      console.error("Authentication failed:", error);
      throw new Error("Authentication failed. Device may need to be re-registered.");
    }
  }

  /**
   * Check if the device is currently authenticated
   */
  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Exchange auth code for Firebase custom token via Cloud Function
   */
  private async getCustomToken(authCode: string, deviceId: string): Promise<string> {
    const response = await fetch(this.customTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authCode,
        deviceId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const responseData = await response.json() as { customToken: string; };
    return responseData.customToken;
  }
}
