import { describe, expect, test } from "bun:test";
import { createConfig } from "../oauth-setup";

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
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      });
    });

    test("should fail on empty strings", () => {
      expect(() => createConfig("", "")).toThrow(/invalid configuration/i);
    });
  });
});