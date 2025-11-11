import crypto from "node:crypto";
import {
  SetupDeviceRequestSchema,
  type SetupDeviceResponse,
  RefreshTokenRequestSchema,
  type RefreshTokenResponse,
} from "@overdrip/core/schemas";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { error, info } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { AuthCodeManager } from "./auth-code-manager";

initializeApp();

const authCodeManager = new AuthCodeManager();




/**
 * Modified setup device function that returns long-lived auth codes
 * instead of custom tokens
 */
export const setupDevice = onCall(async (req) => {
  const userId = req.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Validate request data
  const validationResult = SetupDeviceRequestSchema.safeParse(req.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data");
  }

  const { deviceName, deviceId: providedDeviceId } = validationResult.data;

  try {
    // Generate or validate device ID
    let deviceId: string;
    let isReauth = false;

    if (providedDeviceId) {
      // Re-authentication case - validate device exists and revoke old auth code
      const oldDeviceData = await authCodeManager.getDeviceData(userId, providedDeviceId);

      if (oldDeviceData?.authCode) {
        await authCodeManager.revokeAuthCode(oldDeviceData.authCode);
      }

      deviceId = providedDeviceId;
      isReauth = true;
    } else {
      // New device case
      deviceId = crypto.randomUUID();
    }

    // Create new auth code
    const authCode = await authCodeManager.createAuthCode(userId, deviceId, deviceName);

    // Store device registration
    await authCodeManager.storeDeviceRegistration(userId, deviceId, deviceName, authCode, isReauth);

    info("Device setup completed", {
      userId,
      deviceId,
      deviceName,
      isReauth,
      authCodePrefix: authCode.substring(0, 8) + "..."
    });

    // Return auth code instead of custom token
    const response: SetupDeviceResponse = {
      deviceId,
      authCode, // This is the long-lived token the device will use
    };

    return response;
  } catch (err) {
    if (err instanceof HttpsError) {
      throw err;
    }

    error("Error setting up device:", {
      error: err instanceof Error ? err.message : String(err),
      userId
    });
    throw new HttpsError("internal", "Failed to setup device");
  }
});

/**
 * Unauthenticated endpoint to exchange auth codes for Firebase custom tokens
 * Devices call this on startup to get a fresh Firebase token
 */
export const refreshDeviceToken = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Validate request body
      const validationResult = RefreshTokenRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
        return;
      }

      const { authCode, deviceId } = validationResult.data;
      const authCodePrefix = authCode.substring(0, 8) + "...";

      // Validate auth code and get user data
      const { userId, deviceName } = await authCodeManager.validateAuthCode(authCode, deviceId);

      // Generate fresh Firebase custom token
      const customToken = await authCodeManager.createCustomToken(
        deviceId,
        userId,
        deviceName,
        authCode.substring(0, 8)
      );

      // Update last used timestamp
      await authCodeManager.markAuthCodeUsed(authCode);

      info("Token refresh successful", {
        deviceId,
        deviceName,
        userId,
        authCodePrefix
      });

      const response: RefreshTokenResponse = { customToken };
      res.json(response);

    } catch (err) {
      const authCodePrefix = req.body?.authCode?.substring(0, 8) + "..." || "unknown";
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Log appropriate level based on error type
      if (errorMessage.includes('Invalid auth code') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('mismatch')) {
        info(`Token refresh failed - ${errorMessage}`, {
          authCodePrefix,
          deviceId: req.body?.deviceId
        });
        res.status(401).json({ error: errorMessage });
      } else {
        error("Error refreshing device token:", {
          error: errorMessage,
          deviceId: req.body?.deviceId,
          authCodePrefix
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * Function to revoke auth codes (for device logout/deregistration)
 */
export const revokeDeviceToken = onCall(async (req) => {
  const userId = req.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { deviceId } = req.data;
  if (!deviceId) {
    throw new HttpsError("invalid-argument", "deviceId is required");
  }

  try {
    // Get device data and validate ownership
    const deviceData = await authCodeManager.getDeviceData(userId, deviceId);
    const authCode = deviceData.authCode;

    if (authCode) {
      // Revoke the auth code
      await authCodeManager.revokeAuthCode(authCode);
    }

    // Remove device registration
    await authCodeManager.deleteDevice(userId, deviceId);

    info("Device revoked successfully", { userId, deviceId });

    return { success: true };
  } catch (err) {
    if (err instanceof HttpsError) {
      throw err;
    }

    // Handle auth code manager errors
    if (err instanceof Error && err.message === "Device not found") {
      throw new HttpsError("not-found", "Device not found");
    }

    error("Error revoking device:", {
      error: err instanceof Error ? err.message : String(err),
      userId,
      deviceId
    });
    throw new HttpsError("internal", "Failed to revoke device");
  }
});

/**
 * List all auth codes for a user (for device management)
 */
export const listAuthCodes = onCall(async (req) => {
  const userId = req.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const db = getFirestore();

    // Get all auth codes for this user
    const authCodesSnapshot = await db
      .collection("authCodes")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const authCodes = authCodesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        authCodePrefix: doc.id.substring(0, 8) + "...", // Don't return full code
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        lastUsed: data.lastUsed?.toDate() || null,
      };
    });

    return { authCodes };
  } catch (err) {
    error("Error listing auth codes:", {
      error: err instanceof Error ? err.message : String(err),
      userId
    });
    throw new HttpsError("internal", "Failed to list auth codes");
  }
});
