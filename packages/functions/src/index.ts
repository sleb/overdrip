import {
  SetupDeviceRequestSchema,
  type SetupDeviceResponse,
  SetupDeviceResponseSchema,
} from "@overdrip/core/schemas";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { error } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();




/**
 * New setup device function that works with authenticated users
 * Replaces the createDevice flow with direct Google OAuth integration
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
    const db = getFirestore();
    const auth = getAuth();

    // Generate or validate device ID
    let deviceId: string;
    if (providedDeviceId) {
      // Re-authentication case - validate device exists and belongs to user
      const deviceDoc = await db
        .collection("users")
        .doc(userId)
        .collection("devices")
        .doc(providedDeviceId)
        .get();

      if (!deviceDoc.exists) {
        throw new HttpsError("not-found", "Device not found");
      }

      deviceId = providedDeviceId;
    } else {
      // New device case
      deviceId = crypto.randomUUID();
    }

    // Create custom token for the device
    const customToken = await auth.createCustomToken(deviceId);

    // Store/update device registration
    const deviceData: any = {
      name: deviceName,
      lastSetup: new Date(),
      setupMethod: "google_oauth",
    };

    // Only set registeredAt for new devices
    if (!providedDeviceId) {
      deviceData.registeredAt = new Date();
    }

    await db
      .collection("users")
      .doc(userId)
      .collection("devices")
      .doc(deviceId)
      .set(deviceData, { merge: true });

    const response: SetupDeviceResponse = {
      deviceId,
      customToken,
    };

    // Validate response against schema before returning
    return SetupDeviceResponseSchema.parse(response);
  } catch (err) {
    if (err instanceof HttpsError) {
      throw err;
    }

    error("Error setting up device:", { error: err instanceof Error ? err.message : String(err), userId });
    throw new HttpsError("internal", "Failed to setup device");
  }
});
