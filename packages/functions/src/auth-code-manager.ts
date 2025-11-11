import crypto from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Consolidated auth code management utilities
 */
export class AuthCodeManager {
  private db = getFirestore();
  private auth = getAuth();

  /**
   * Generate a cryptographically secure auth code
   */
  generateAuthCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create and store a new auth code
   */
  async createAuthCode(userId: string, deviceId: string, deviceName: string): Promise<string> {
    const authCode = this.generateAuthCode();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    await this.db.collection('authCodes').doc(authCode).set({
      userId,
      deviceId,
      deviceName,
      createdAt: new Date(),
      expiresAt,
      lastUsed: null,
    });

    return authCode;
  }

  /**
   * Validate and retrieve auth code data
   */
  async validateAuthCode(authCode: string, deviceId: string): Promise<{
    userId: string;
    deviceName: string;
  }> {
    const authCodeDoc = await this.db.collection("authCodes").doc(authCode).get();

    if (!authCodeDoc.exists) {
      throw new Error('Invalid auth code');
    }

    const authData = authCodeDoc.data()!;

    // Validate auth code hasn't expired
    if (authData.expiresAt.toDate() < new Date()) {
      throw new Error('Auth code expired');
    }

    // Validate device ID matches
    if (authData.deviceId !== deviceId) {
      throw new Error('Device ID mismatch');
    }

    return {
      userId: authData.userId,
      deviceName: authData.deviceName
    };
  }

  /**
   * Generate Firebase custom token with consistent claims
   */
  async createCustomToken(deviceId: string, userId: string, deviceName: string, authCodePrefix: string): Promise<string> {
    return await this.auth.createCustomToken(deviceId, {
      deviceName,
      userId,
      authCodePrefix,
    });
  }

  /**
   * Update auth code last used timestamp
   */
  async markAuthCodeUsed(authCode: string): Promise<void> {
    await this.db.collection("authCodes").doc(authCode).update({
      lastUsed: new Date(),
    });
  }

  /**
   * Revoke an auth code by deleting it
   */
  async revokeAuthCode(authCode: string): Promise<void> {
    await this.db.collection("authCodes").doc(authCode).delete();
  }

  /**
   * Store or update device registration
   */
  async storeDeviceRegistration(
    userId: string,
    deviceId: string,
    deviceName: string,
    authCode: string,
    isReauth: boolean
  ): Promise<void> {
    const deviceData: any = {
      name: deviceName,
      lastSetup: new Date(),
      setupMethod: "google_oauth",
      authCode,
    };

    // Only set registeredAt for new devices
    if (!isReauth) {
      deviceData.registeredAt = new Date();
    }

    await this.db
      .collection("users")
      .doc(userId)
      .collection("devices")
      .doc(deviceId)
      .set(deviceData, { merge: true });
  }

  /**
   * Get device data and validate ownership
   */
  async getDeviceData(userId: string, deviceId: string): Promise<any> {
    const deviceDoc = await this.db
      .collection("users")
      .doc(userId)
      .collection("devices")
      .doc(deviceId)
      .get();

    if (!deviceDoc.exists) {
      throw new Error("Device not found");
    }

    return deviceDoc.data();
  }

  /**
   * Delete device registration
   */
  async deleteDevice(userId: string, deviceId: string): Promise<void> {
    await this.db
      .collection("users")
      .doc(userId)
      .collection("devices")
      .doc(deviceId)
      .delete();
  }
}
