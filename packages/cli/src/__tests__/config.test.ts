import { describe, expect, test } from "bun:test";
import { createConfig } from "../config";

describe("Configuration", () => {
  describe("createConfig", () => {
    test("should create config with all provided values", () => {
      const clientId = "test-client-id";
      const clientSecret = "test-client-secret";
      const config = createConfig(
        clientId,
        clientSecret,
      );

      expect(config).toEqual({
        googleOAuthClientId: clientId,
        googleOAuthClientSecret: clientSecret,
      });
    });

    test("should fail on empty strings", () => {
      expect(() => createConfig("", "")).toThrow(/invalid configuration/i);
    });
  });
});