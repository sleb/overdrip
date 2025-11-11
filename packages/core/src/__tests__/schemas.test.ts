import { describe, test, expect } from "bun:test";
import {
  ClientAuthTokensSchema,
  RefreshTokenRequestSchema,
  RefreshTokenResponseSchema,
  SetupDeviceRequestSchema,
  SetupDeviceResponseSchema,
} from "../schemas";

describe("Schema Validation", () => {
  describe("ClientAuthTokensSchema", () => {
    test("should validate correct auth tokens", () => {
      const validTokens = {
        authCode: "a".repeat(64), // 64 hex chars
        deviceId: "550e8400-e29b-41d4-a716-446655440000",
        deviceName: "Test Device"
      };

      expect(() => ClientAuthTokensSchema.parse(validTokens)).not.toThrow();
    });

    test("should reject invalid auth code length", () => {
      const invalidTokens = {
        authCode: "short",
        deviceId: "550e8400-e29b-41d4-a716-446655440000",
        deviceName: "Test Device"
      };

      expect(() => ClientAuthTokensSchema.parse(invalidTokens)).toThrow();
    });

    test("should reject invalid device ID format", () => {
      const invalidTokens = {
        authCode: "a".repeat(64),
        deviceId: "not-a-uuid",
        deviceName: "Test Device"
      };

      expect(() => ClientAuthTokensSchema.parse(invalidTokens)).toThrow();
    });

    test("should reject empty device name", () => {
      const invalidTokens = {
        authCode: "a".repeat(64),
        deviceId: "550e8400-e29b-41d4-a716-446655440000",
        deviceName: ""
      };

      expect(() => ClientAuthTokensSchema.parse(invalidTokens)).toThrow();
    });
  });

  describe("RefreshTokenRequestSchema", () => {
    test("should validate correct refresh request", () => {
      const validRequest = {
        authCode: "b".repeat(64),
        deviceId: "550e8400-e29b-41d4-a716-446655440000"
      };

      expect(() => RefreshTokenRequestSchema.parse(validRequest)).not.toThrow();
    });

    test("should reject incorrect auth code length", () => {
      const invalidRequest = {
        authCode: "b".repeat(32), // Too short
        deviceId: "550e8400-e29b-41d4-a716-446655440000"
      };

      expect(() => RefreshTokenRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe("SetupDeviceRequestSchema", () => {
    test("should validate new device request", () => {
      const validRequest = {
        deviceName: "Kitchen Pi"
      };

      expect(() => SetupDeviceRequestSchema.parse(validRequest)).not.toThrow();
    });

    test("should validate re-auth request", () => {
      const validRequest = {
        deviceName: "Kitchen Pi",
        deviceId: "550e8400-e29b-41d4-a716-446655440000"
      };

      expect(() => SetupDeviceRequestSchema.parse(validRequest)).not.toThrow();
    });

    test("should reject device name that's too long", () => {
      const invalidRequest = {
        deviceName: "a".repeat(51) // Max is 50
      };

      expect(() => SetupDeviceRequestSchema.parse(invalidRequest)).toThrow();
    });

    test("should reject empty device name", () => {
      const invalidRequest = {
        deviceName: ""
      };

      expect(() => SetupDeviceRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe("SetupDeviceResponseSchema", () => {
    test("should validate correct response", () => {
      const validResponse = {
        deviceId: "550e8400-e29b-41d4-a716-446655440000",
        authCode: "c".repeat(64)
      };

      expect(() => SetupDeviceResponseSchema.parse(validResponse)).not.toThrow();
    });

    test("should reject response with invalid auth code", () => {
      const invalidResponse = {
        deviceId: "550e8400-e29b-41d4-a716-446655440000",
        authCode: "short"
      };

      expect(() => SetupDeviceResponseSchema.parse(invalidResponse)).toThrow();
    });
  });

  describe("RefreshTokenResponseSchema", () => {
    test("should validate correct response", () => {
      const validResponse = {
        customToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
      };

      expect(() => RefreshTokenResponseSchema.parse(validResponse)).not.toThrow();
    });

    test("should reject empty custom token", () => {
      const invalidResponse = {
        customToken: ""
      };

      expect(() => RefreshTokenResponseSchema.parse(invalidResponse)).toThrow();
    });
  });
});
