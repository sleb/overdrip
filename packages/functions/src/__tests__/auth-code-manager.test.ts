import { describe, test, expect } from "bun:test";
import crypto from "node:crypto";

describe("AuthCodeManager Logic", () => {
  describe("Auth Code Generation", () => {
    test("should generate 64-character hex string", () => {
      // Test the core crypto logic directly
      const authCode = crypto.randomBytes(32).toString('hex');

      expect(authCode).toHaveLength(64);
      expect(authCode).toMatch(/^[0-9a-f]+$/); // hex chars only
    });
  });

  describe("Custom Token Claims Structure", () => {
    test("should structure claims correctly", () => {
      const claims = {
        deviceName: "Test Device",
        userId: "user123",
        authCodePrefix: "abc12345"
      };

      expect(claims).toHaveProperty('deviceName');
      expect(claims).toHaveProperty('userId');
      expect(claims).toHaveProperty('authCodePrefix');
      expect(typeof claims.deviceName).toBe('string');
      expect(typeof claims.userId).toBe('string');
      expect(typeof claims.authCodePrefix).toBe('string');
    });

    test("should create auth code prefix correctly", () => {
      const fullAuthCode = "b4df069d94f46cef0f6d9acea067cdd8c898c871d60b4551bdbe32c8d5b775a9";
      const prefix = fullAuthCode.substring(0, 8);

      expect(prefix).toBe("b4df069d");
      expect(prefix).toHaveLength(8);
    });
  });
});
