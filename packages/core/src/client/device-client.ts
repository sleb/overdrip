import { signInWithCustomToken } from "firebase/auth/web-extension";
import { FUNCTIONS_URL } from "../config";
import { auth } from "../firebase";
import { type ClientAuthTokens } from "../schemas";

export interface DeviceClientOptions {
  authCode?: string;
  deviceId?: string;
  deviceName?: string;
  functionsUrl?: string;
}

/**
 * Main Overdrip Device SDK Client
 *
 * Provides a unified interface for device authentication and cloud operations.
 * Abstracts away Firebase implementation details.
 */
export class OverdripDeviceClient {
  private tokens: ClientAuthTokens | null = null;
  private functionsUrl: string;
  private authenticated: boolean = false;

  constructor(private options: DeviceClientOptions = {}) {
    this.functionsUrl = options.functionsUrl ||
      `${FUNCTIONS_URL}/refreshDeviceToken` ||
      'https://refreshdevicetoken-h356ephhyq-uc.a.run.app';
  }

  /**
   * Authenticate the device with the server
   * Must be called before using other methods
   */
  async authenticate(authCode?: string, deviceId?: string): Promise<void> {
    // Use provided credentials or fallback to options/stored tokens
    const finalAuthCode = authCode || this.options.authCode;
    const finalDeviceId = deviceId || this.options.deviceId;

    if (!finalAuthCode || !finalDeviceId) {
      throw new Error("Device not set up. Auth code and device ID are required.");
    }

    try {
      // Exchange auth code for Firebase custom token
      const customToken = await this.getCustomToken(finalAuthCode, finalDeviceId);

      // Sign into Firebase - Firebase handles all refresh from here
      await signInWithCustomToken(auth, customToken);

      this.authenticated = true;
      console.log(`✓ Device authenticated: ${finalDeviceId}`);
    } catch (error) {
      console.error("Authentication failed:", error);
      throw new Error("Authentication failed. Device may need to be re-registered.");
    }
  }

  /**
   * Check if the device is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated && auth.currentUser !== null;
  }

  /**
   * Refresh authentication tokens if needed
   */
  async refreshAuth(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error("Device not authenticated. Call authenticate() first.");
    }
    // Firebase handles token refresh automatically, so this is mostly a no-op
    // Could add custom token refresh logic here if needed
  }

  /**
   * Sign out and clear authentication
   */
  async disconnect(): Promise<void> {
    await auth.signOut();
    this.authenticated = false;
  }

  // ============================================================================
  // MINIMAL API STUBS - To be implemented as needed
  // ============================================================================

  /**
   * Upload sensor reading data
   * TODO: Implement when telemetry system is ready
   */
  async uploadSensorReading(reading: any): Promise<void> {
    this.ensureAuthenticated();
    console.log("📊 [STUB] Would upload sensor reading:", reading);
    // TODO: Implement Firestore upload
  }

  /**
   * Upload multiple sensor readings in batch
   * TODO: Implement when telemetry system is ready
   */
  async uploadSensorReadings(readings: any[]): Promise<void> {
    this.ensureAuthenticated();
    console.log("📊 [STUB] Would upload sensor readings batch:", readings.length, "readings");
    // TODO: Implement batched Firestore upload
  }

  /**
   * Upload device status/health information
   * TODO: Implement when health monitoring is ready
   */
  async uploadDeviceStatus(status: any): Promise<void> {
    this.ensureAuthenticated();
    console.log("💚 [STUB] Would upload device status:", status);
    // TODO: Implement Firestore status update
  }

  /**
   * Get device configuration from server
   * TODO: Implement when config system is ready
   */
  async getDeviceConfig(): Promise<any> {
    this.ensureAuthenticated();
    console.log("⚙️ [STUB] Would fetch device config");
    // TODO: Implement Firestore config fetch
    return {};
  }

  /**
   * Listen for configuration updates
   * TODO: Implement when config system is ready
   */
  onConfigUpdate(callback: (config: any) => void): void {
    this.ensureAuthenticated();
    console.log("⚙️ [STUB] Would listen for config updates");
    // TODO: Implement Firestore listener
  }

  /**
   * Listen for remote commands
   * TODO: Implement when command system is ready
   */
  onCommand(callback: (command: any) => void): void {
    this.ensureAuthenticated();
    console.log("🎮 [STUB] Would listen for remote commands");
    // TODO: Implement Firestore listener for commands
  }

  /**
   * Acknowledge command completion
   * TODO: Implement when command system is ready
   */
  async acknowledgeCommand(commandId: string, result: any): Promise<void> {
    this.ensureAuthenticated();
    console.log("✅ [STUB] Would acknowledge command:", commandId, result);
    // TODO: Implement Firestore command update
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Exchange auth code for Firebase custom token via Cloud Function
   */
  private async getCustomToken(authCode: string, deviceId: string): Promise<string> {
    const response = await fetch(this.functionsUrl, {
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

    const responseData = await response.json() as { customToken: string };
    return responseData.customToken;
  }

  /**
   * Ensure device is authenticated before making API calls
   */
  private ensureAuthenticated(): void {
    if (!this.isAuthenticated()) {
      throw new Error("Device not authenticated. Call authenticate() first.");
    }
  }
}
