import {
  type CreateDeviceResponse,
  CreateDeviceResponseSchema,
  RegisterDeviceRequestSchema,
  type RegisterDeviceResponse,
  RegisterDeviceResponseSchema,
  SetupDeviceRequestSchema,
  type SetupDeviceResponse,
  SetupDeviceResponseSchema,
} from "@overdrip/core/schemas";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { error, info } from "firebase-functions/logger";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

/**
 * Helper to generate registration code
 */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRegistrationCode(): string {
  const randomChars = (length: number): string => {
    const chars = Array.from(
      { length },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    );
    return chars.join("");
  };
  return `${randomChars(4)}-${randomChars(4)}`;
}

export const createDevice = onRequest(
  {
    serviceAccount:
      "firebase-adminsdk-fbsvc@overdrip-ed767.iam.gserviceaccount.com",
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const db = getFirestore();

      // Generate unique device ID
      const deviceId = crypto.randomUUID();

      // Create custom token for this device ID
      const auth = getAuth();
      const customToken = await auth.createCustomToken(deviceId);

      // Generate registration code
      const registrationCode = generateRegistrationCode();

      // Store registration code in Firestore
      await db.collection("registration-codes").doc(registrationCode).set({
        deviceId,
        createdAt: new Date(),
      });

      const response: CreateDeviceResponse = {
        deviceId,
        customToken,
        registrationCode,
      };

      // Validate response against schema before sending
      res.json(CreateDeviceResponseSchema.parse(response));
    } catch (e) {
      error("Error creating device:", { error: e });
      res.status(500).json({ error: "Failed to create device" });
      return;
    }
  },
);

/**
 * Registers a device to a user account
 */
export const registerDevice = onCall(async (req) => {
  const userId = req.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Validate request data
  const validationResult = RegisterDeviceRequestSchema.safeParse(req.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data");
  }

  const { code, deviceName } = validationResult.data;

  const db = getFirestore();

  // Look up registration code
  const codeDoc = await db.collection("registration-codes").doc(code).get();

  const data = codeDoc.data();
  if (!data) {
    throw new HttpsError("not-found", "Invalid registration code");
  }

  const { deviceId, createdAt } = data;

  // Check expiration (24 hours)
  const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (createdAt.toDate() < expirationTime) {
    // Delete expired code
    await codeDoc.ref.delete();
    throw new HttpsError("deadline-exceeded", "Registration code expired");
  }

  // Link device to user
  await db
    .collection("users")
    .doc(userId)
    .collection("devices")
    .doc(deviceId)
    .set({
      name: deviceName || "Plant Monitor",
      code,
      registeredAt: new Date(),
    });

  // Delete one-time code
  await codeDoc.ref.delete();

  const response: RegisterDeviceResponse = { success: true, deviceId };

  // Validate response against schema before returning
  return RegisterDeviceResponseSchema.parse(response);
});

/**
 * Scheduled function to clean up expired registration codes
 * Runs daily at 3 AM UTC
 */
export const cleanupExpiredCodes = onSchedule("0 3 * * *", async () => {
  const db = getFirestore();
  const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Query for expired codes
    const expiredCodesSnapshot = await db
      .collection("registration-codes")
      .where("createdAt", "<", expirationTime)
      .get();

    const deletedCount = expiredCodesSnapshot.size;

    if (deletedCount === 0) {
      // Log with structured data for metrics
      info("Registration code cleanup completed", {
        deletedCount: 0,
        metric: "registration_codes_cleanup",
      });
      return;
    }

    // Delete expired codes in batch
    const batch = db.batch();
    expiredCodesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Log with structured data for Cloud Monitoring metrics
    info("Registration code cleanup completed", {
      deletedCount,
      metric: "registration_codes_cleanup",
    });
  } catch (e) {
    error("Error cleaning up expired codes", {
      error: e,
      metric: "registration_codes_cleanup",
      success: false,
    });
    throw e;
  }
});

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
    await db
      .collection("users")
      .doc(userId)
      .collection("devices")
      .doc(deviceId)
      .set(
        {
          name: deviceName,
          registeredAt: providedDeviceId ? undefined : new Date(), // Only set on new devices
          lastSetup: new Date(),
          setupMethod: "google_oauth",
        },
        { merge: true }
      );

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
