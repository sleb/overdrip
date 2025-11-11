import { z } from "zod";

/**
 * Shared Zod schemas for Cloud Functions API contracts
 * These ensure type safety between client and server
 */

// setupDevice endpoint
export const SetupDeviceRequestSchema = z.object({
  deviceName: z.string().min(1).max(50),
  deviceId: z.string().uuid().optional(),
});

export const SetupDeviceResponseSchema = z.object({
  deviceId: z.string().uuid(),
  customToken: z.string(),
});

export const SetupDeviceErrorSchema = z.object({
  error: z.string(),
});

export type SetupDeviceRequest = z.infer<typeof SetupDeviceRequestSchema>;
export type SetupDeviceResponse = z.infer<typeof SetupDeviceResponseSchema>;
export type SetupDeviceError = z.infer<typeof SetupDeviceErrorSchema>;
