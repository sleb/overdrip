import { z } from "zod";

/**
 * Shared Zod schemas for Cloud Functions API contracts
 * These ensure type safety between client and server
 */

// setupDevice endpoint - now returns authCode instead of customToken
export const SetupDeviceRequestSchema = z.object({
  deviceName: z.string().min(1).max(50),
  deviceId: z.string().uuid().optional(),
});

export const SetupDeviceResponseSchema = z.object({
  deviceId: z.string().uuid(),
  authCode: z.string().length(64).regex(/^[0-9a-f]+$/), // 32 bytes hex = 64 chars
});

export const SetupDeviceErrorSchema = z.object({
  error: z.string(),
});

// refreshDeviceToken endpoint - unauthenticated HTTP endpoint
export const RefreshTokenRequestSchema = z.object({
  authCode: z.string().length(64).regex(/^[0-9a-f]+$/),
  deviceId: z.string().uuid(),
});

export const RefreshTokenResponseSchema = z.object({
  customToken: z.string().min(1),
});

export const RefreshTokenErrorSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

// revokeDeviceToken endpoint
export const RevokeDeviceTokenRequestSchema = z.object({
  deviceId: z.string().uuid(),
});

export const RevokeDeviceTokenResponseSchema = z.object({
  success: z.boolean(),
});

// listAuthCodes endpoint response
export const AuthCodeInfoSchema = z.object({
  authCodePrefix: z.string(),
  deviceId: z.string().uuid(),
  deviceName: z.string(),
  createdAt: z.date(),
  expiresAt: z.date(),
  lastUsed: z.date().nullable(),
});

export const ListAuthCodesResponseSchema = z.object({
  authCodes: z.array(AuthCodeInfoSchema),
});

// Client-side auth storage schema
export const ClientAuthTokensSchema = z.object({
  authCode: z.string().length(64).regex(/^[0-9a-f]+$/),
  deviceId: z.string().uuid(),
  deviceName: z.string().min(1),
});

// Type exports
export type SetupDeviceRequest = z.infer<typeof SetupDeviceRequestSchema>;
export type SetupDeviceResponse = z.infer<typeof SetupDeviceResponseSchema>;
export type SetupDeviceError = z.infer<typeof SetupDeviceErrorSchema>;

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type RefreshTokenError = z.infer<typeof RefreshTokenErrorSchema>;

export type RevokeDeviceTokenRequest = z.infer<typeof RevokeDeviceTokenRequestSchema>;
export type RevokeDeviceTokenResponse = z.infer<typeof RevokeDeviceTokenResponseSchema>;

export type AuthCodeInfo = z.infer<typeof AuthCodeInfoSchema>;
export type ListAuthCodesResponse = z.infer<typeof ListAuthCodesResponseSchema>;

export type ClientAuthTokens = z.infer<typeof ClientAuthTokensSchema>;
