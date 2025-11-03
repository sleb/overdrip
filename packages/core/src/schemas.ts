import { z } from "zod";

/**
 * Shared Zod schemas for Cloud Functions API contracts
 * These ensure type safety between client and server
 */

// createDevice endpoint
export const CreateDeviceResponseSchema = z.object({
  customToken: z.string(),
  deviceId: z.string(),
  registrationCode: z.string(),
});

export const CreateDeviceErrorSchema = z.object({
  error: z.string(),
});

export type CreateDeviceResponse = z.infer<typeof CreateDeviceResponseSchema>;
export type CreateDeviceError = z.infer<typeof CreateDeviceErrorSchema>;

// registerDevice endpoint
export const RegisterDeviceRequestSchema = z.object({
  code: z.string(),
  deviceName: z.string(),
});

export const RegisterDeviceResponseSchema = z.object({
  success: z.boolean(),
  deviceId: z.string(),
});

export type RegisterDeviceRequest = z.infer<typeof RegisterDeviceRequestSchema>;
export type RegisterDeviceResponse = z.infer<
  typeof RegisterDeviceResponseSchema
>;
