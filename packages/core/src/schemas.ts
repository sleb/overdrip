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
