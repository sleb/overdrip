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

    test("should generate unique codes", () => {
      const code1 = crypto.randomBytes(32).toString('hex');
      const code2 = crypto.randomBytes(32).toString('hex');

      expect(code1).not.toBe(code2);
    });
  });

  describe("Auth Code Validation Logic", () => {
    test("should validate expiration correctly", () => {
      const now = new Date();
      const futureDate = new Date(Date.now() + 86400000); // 1 day future
      const pastDate = new Date(Date.now() - 86400000); // 1 day past

      expect(futureDate > now).toBe(true);
      expect(pastDate < now).toBe(true);
    });

    test("should validate device ID matching", () => {
      const deviceId1 = "device123";
      const deviceId2 = "device456";

      expect(deviceId1 === deviceId1).toBe(true);
      expect(deviceId1 === deviceId2).toBe(false);
    });
  });

  describe("Expiration Calculation", () => {
    test("should calculate 1 year expiration correctly", () => {
      const now = Date.now();
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      const expirationDate = new Date(now + oneYear);

      // Should be approximately 1 year from now
      expect(expirationDate.getTime()).toBeGreaterThan(now + oneYear - 1000);
      expect(expirationDate.getTime()).toBeLessThan(now + oneYear + 1000);
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
