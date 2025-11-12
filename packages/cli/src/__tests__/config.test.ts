import { describe, expect, test } from "bun:test";
import { createConfig, loadConfig, type CliConfig } from "../config";

describe("Configuration", () => {
  describe("createConfig", () => {
    test("should create config with all provided values", () => {
      const config = createConfig(
        "test-client-id",
        "test-secret",
        "https://test-function.com"
      );

      expect(config).toEqual({
        googleOAuthClientId: "test-client-id",
        googleOAuthClientSecret: "test-secret",
        firebaseFunctionsUrl: "https://test-function.com",
      });
    });

    test("should handle different client ID formats", () => {
      const clientIds = [
        "simple-client-id",
        "client-id.apps.googleusercontent.com",
        "123456789-abcdefg.apps.googleusercontent.com",
        "client_with_underscores",
        "client-with-dashes",
      ];

      clientIds.forEach(clientId => {
        const config = createConfig(clientId, "secret", "https://example.com");
        expect(config.googleOAuthClientId).toBe(clientId);
      });
    });

    test("should handle different Firebase Functions URL formats", () => {
      const urls = [
        "https://us-central1-project.cloudfunctions.net/function",
        "https://function-abcd1234-uc.a.run.app",
        "http://localhost:5001/project/us-central1/function",
      ];

      urls.forEach(url => {
        const config = createConfig("client-id", "secret", url);
        expect(config.firebaseFunctionsUrl).toBe(url);
      });
    });

    test("should preserve whitespace in values", () => {
      const config = createConfig(
        "  client-id  ",
        "  secret  ",
        "  https://example.com  "
      );

      expect(config.googleOAuthClientId).toBe("  client-id  ");
      expect(config.googleOAuthClientSecret).toBe("  secret  ");
      expect(config.firebaseFunctionsUrl).toBe("  https://example.com  ");
    });

    test("should handle empty strings", () => {
      const config = createConfig("", "", "");

      expect(config.googleOAuthClientId).toBe("");
      expect(config.googleOAuthClientSecret).toBe("");
      expect(config.firebaseFunctionsUrl).toBe("");
    });

    test("should maintain correct types for all fields", () => {
      const config = createConfig(
        "client-id",
        "secret",
        "https://example.com"
      );

      expect(typeof config.googleOAuthClientId).toBe("string");
      expect(typeof config.googleOAuthClientSecret).toBe("string");
      expect(typeof config.firebaseFunctionsUrl).toBe("string");
    });

    test("should return object with exact expected keys", () => {
      const config = createConfig("id", "secret", "url");

      const keys = Object.keys(config).sort();
      expect(keys).toEqual([
        "firebaseFunctionsUrl",
        "googleOAuthClientId",
        "googleOAuthClientSecret",
      ].sort());
    });
  });

  describe("loadConfig", () => {
    test("should load config from environment variables", () => {
      const config = loadConfig();

      // Should return an object with the expected structure
      expect(config).toBeDefined();
      expect(config).toBeObject();
      expect(config).toHaveProperty("googleOAuthClientId");
      expect(config).toHaveProperty("googleOAuthClientSecret");
      expect(config).toHaveProperty("firebaseFunctionsUrl");
    });

    test("should return consistent values on multiple calls", () => {
      const config1 = loadConfig();
      const config2 = loadConfig();

      // Should return the same values each time (build-time constants)
      expect(config1.googleOAuthClientId).toBe(config2.googleOAuthClientId);
      expect(config1.googleOAuthClientSecret).toBe(config2.googleOAuthClientSecret);
      expect(config1.firebaseFunctionsUrl).toBe(config2.firebaseFunctionsUrl);
    });

    test("should return values from environment variables", () => {
      const config = loadConfig();

      // The values should match what's captured from process.env at module load time
      // Values are captured when the module is first imported, not at test runtime
      expect(config).toHaveProperty("googleOAuthClientId");
      expect(config).toHaveProperty("googleOAuthClientSecret");
      expect(config).toHaveProperty("firebaseFunctionsUrl");
    });

    test("should handle cases where environment variables are set", () => {
      // If any env vars are set, they should be present in config
      const config = loadConfig();

      if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
        expect(config.googleOAuthClientId).toBeTruthy();
        expect(typeof config.googleOAuthClientId).toBe("string");
      }

      if (process.env.FIREBASE_FUNCTIONS_URL) {
        expect(config.firebaseFunctionsUrl).toBeTruthy();
        expect(typeof config.firebaseFunctionsUrl).toBe("string");
        // Should be valid URL format if present
        expect(
          config.firebaseFunctionsUrl.startsWith("http://") ||
          config.firebaseFunctionsUrl.startsWith("https://")
        ).toBe(true);
      }
    });
  });

  describe("CliConfig interface", () => {
    test("should enforce correct config shape with createConfig", () => {
      const config: CliConfig = createConfig(
        "client-id",
        "secret",
        "https://example.com"
      );

      expect(config).toHaveProperty("googleOAuthClientId");
      expect(config).toHaveProperty("googleOAuthClientSecret");
      expect(config).toHaveProperty("firebaseFunctionsUrl");
    });

    test("should enforce correct config shape with loadConfig", () => {
      const config: CliConfig = loadConfig();

      expect(config).toHaveProperty("googleOAuthClientId");
      expect(config).toHaveProperty("googleOAuthClientSecret");
      expect(config).toHaveProperty("firebaseFunctionsUrl");
    });
  });
});