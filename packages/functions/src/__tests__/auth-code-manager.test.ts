import { describe, expect, test } from "bun:test";
import {
  calculateExpirationDate,
  createAuthCodePrefix,
  createCustomTokenClaims,
  generateAuthCode,
  isAuthCodeExpired,
  isValidAuthCodeFormat,
} from "../auth-code-manager";

describe("Auth Code Manager", () => {
  describe("generateAuthCode", () => {
    test("should generate 64-character hex string", () => {
      const authCode = generateAuthCode();

      expect(authCode).toHaveLength(64);
      expect(authCode).toMatch(/^[0-9a-f]+$/);
    });

    test("should generate unique codes on each call", () => {
      const code1 = generateAuthCode();
      const code2 = generateAuthCode();
      const code3 = generateAuthCode();

      expect(code1).not.toBe(code2);
      expect(code2).not.toBe(code3);
      expect(code1).not.toBe(code3);
    });

    test("should generate valid format matching schema requirements", () => {
      const authCode = generateAuthCode();

      // Should match the regex from RefreshTokenRequestSchema
      expect(isValidAuthCodeFormat(authCode)).toBe(true);
    });
  });

  describe("createAuthCodePrefix", () => {
    test("should create 8-character prefix from auth code", () => {
      const fullAuthCode = "b4df069d94f46cef0f6d9acea067cdd8c898c871d60b4551bdbe32c8d5b775a9";
      const prefix = createAuthCodePrefix(fullAuthCode);

      expect(prefix).toBe("b4df069d");
      expect(prefix).toHaveLength(8);
    });

    test("should extract first 8 characters", () => {
      const testCases = [
        { input: "abcdef1234567890" + "0".repeat(48), expected: "abcdef12" },
        { input: "12345678" + "0".repeat(56), expected: "12345678" },
        { input: "ffffffff" + "a".repeat(56), expected: "ffffffff" },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(createAuthCodePrefix(input)).toBe(expected);
      });
    });
  });

  describe("calculateExpirationDate", () => {
    test("should calculate expiration date in the future", () => {
      const now = Date.now();
      const expiresAt = calculateExpirationDate(365);

      expect(expiresAt.getTime()).toBeGreaterThan(now);
    });

    test("should calculate correct number of days in future", () => {
      const daysToTest = [1, 7, 30, 365];

      daysToTest.forEach(days => {
        const expiresAt = calculateExpirationDate(days);
        const expectedTime = Date.now() + days * 24 * 60 * 60 * 1000;

        // Allow 1 second tolerance for test execution time
        expect(Math.abs(expiresAt.getTime() - expectedTime)).toBeLessThan(1000);
      });
    });

    test("should handle different day counts", () => {
      const oneDay = calculateExpirationDate(1);
      const oneYear = calculateExpirationDate(365);

      expect(oneYear.getTime()).toBeGreaterThan(oneDay.getTime());
    });
  });

  describe("isAuthCodeExpired", () => {
    test("should return true for past dates", () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      expect(isAuthCodeExpired(pastDate)).toBe(true);
    });

    test("should return false for future dates", () => {
      const futureDate = new Date(Date.now() + 1000); // 1 second from now
      expect(isAuthCodeExpired(futureDate)).toBe(false);
    });

    test("should handle various time differences", () => {
      const testCases = [
        { offset: -86400000, expired: true },  // 1 day ago
        { offset: -3600000, expired: true },   // 1 hour ago
        { offset: -1000, expired: true },      // 1 second ago
        { offset: 1000, expired: false },      // 1 second from now
        { offset: 3600000, expired: false },   // 1 hour from now
        { offset: 86400000, expired: false },  // 1 day from now
      ];

      testCases.forEach(({ offset, expired }) => {
        const date = new Date(Date.now() + offset);
        expect(isAuthCodeExpired(date)).toBe(expired);
      });
    });
  });

  describe("isValidAuthCodeFormat", () => {
    test("should validate correct format", () => {
      const validCode = "a".repeat(64);
      expect(isValidAuthCodeFormat(validCode)).toBe(true);
    });

    test("should reject invalid lengths", () => {
      expect(isValidAuthCodeFormat("a".repeat(63))).toBe(false); // Too short
      expect(isValidAuthCodeFormat("a".repeat(65))).toBe(false); // Too long
      expect(isValidAuthCodeFormat("")).toBe(false); // Empty
    });

    test("should reject non-hex characters", () => {
      expect(isValidAuthCodeFormat("g".repeat(64))).toBe(false); // 'g' not hex
      expect(isValidAuthCodeFormat("A".repeat(64))).toBe(false); // Uppercase not allowed
      expect(isValidAuthCodeFormat("0".repeat(63) + "Z")).toBe(false); // Invalid char
    });

    test("should accept all valid hex characters", () => {
      const validHexChars = "0123456789abcdef";
      const validCode = validHexChars.repeat(4); // 64 chars
      expect(isValidAuthCodeFormat(validCode)).toBe(true);
    });
  });

  describe("createCustomTokenClaims", () => {
    test("should structure claims correctly", () => {
      const claims = createCustomTokenClaims("Test Device", "user123", "abc12345");

      expect(claims).toEqual({
        deviceName: "Test Device",
        userId: "user123",
        authCodePrefix: "abc12345"
      });
    });

    test("should have all required properties", () => {
      const claims = createCustomTokenClaims("Device", "user", "prefix");

      expect(claims).toHaveProperty('deviceName');
      expect(claims).toHaveProperty('userId');
      expect(claims).toHaveProperty('authCodePrefix');
    });

    test("should preserve input values", () => {
      const testCases = [
        { deviceName: "Kitchen Pi", userId: "user-001", prefix: "a1b2c3d4" },
        { deviceName: "Living Room Sensor", userId: "user-999", prefix: "ffffffff" },
        { deviceName: "Bedroom Hub", userId: "admin", prefix: "00000000" },
      ];

      testCases.forEach(({ deviceName, userId, prefix }) => {
        const claims = createCustomTokenClaims(deviceName, userId, prefix);

        expect(claims.deviceName).toBe(deviceName);
        expect(claims.userId).toBe(userId);
        expect(claims.authCodePrefix).toBe(prefix);
      });
    });

    test("should maintain correct types", () => {
      const claims = createCustomTokenClaims("Device", "user", "prefix");

      expect(typeof claims.deviceName).toBe('string');
      expect(typeof claims.userId).toBe('string');
      expect(typeof claims.authCodePrefix).toBe('string');
    });
  });
});
