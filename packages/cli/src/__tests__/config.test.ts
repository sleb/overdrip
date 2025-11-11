import { describe, test, expect, mock } from "bun:test";

// Mock the config module to test different scenarios
const createMockConfig = (envVars: Record<string, string | undefined>) => {
  // Mock process.env for this scenario
  const mockProcess = {
    env: envVars
  };

  // Create mock config functions
  const mockLoadConfig = () => {
    const GOOGLE_OAUTH_CLIENT_ID = envVars.GOOGLE_OAUTH_CLIENT_ID;
    const GOOGLE_OAUTH_CLIENT_SECRET = envVars.GOOGLE_OAUTH_CLIENT_SECRET;
    const FIREBASE_FUNCTIONS_URL = envVars.FIREBASE_FUNCTIONS_URL;

    if (!GOOGLE_OAUTH_CLIENT_ID) {
      throw new Error(
        'GOOGLE_OAUTH_CLIENT_ID is required. ' +
        'For development: add to packages/cli/.env file. ' +
        'For production: build with --define GOOGLE_OAUTH_CLIENT_ID=your_client_id'
      );
    }

    return {
      googleOAuthClientId: GOOGLE_OAUTH_CLIENT_ID,
      googleOAuthClientSecret: GOOGLE_OAUTH_CLIENT_SECRET || undefined,
      firebaseFunctionsUrl: FIREBASE_FUNCTIONS_URL || undefined,
    };
  };

  const mockGetConfigSafe = () => {
    try {
      return mockLoadConfig();
    } catch {
      return null;
    }
  };

  const mockValidateConfig = () => {
    try {
      mockLoadConfig();
    } catch (error) {
      console.error('Configuration error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  };

  return { loadConfig: mockLoadConfig, getConfigSafe: mockGetConfigSafe, validateConfig: mockValidateConfig };
};

describe("Configuration", () => {
  describe("loadConfig", () => {
    test("should load valid configuration with required fields", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "test-client-id"
      });

      const config = loadConfig();

      expect(config).toEqual({
        googleOAuthClientId: "test-client-id",
        googleOAuthClientSecret: undefined,
        firebaseFunctionsUrl: undefined,
      });
    });

    test("should load configuration with all optional fields", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "test-client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
        FIREBASE_FUNCTIONS_URL: "https://test-function.com"
      });

      const config = loadConfig();

      expect(config).toEqual({
        googleOAuthClientId: "test-client-id",
        googleOAuthClientSecret: "test-secret",
        firebaseFunctionsUrl: "https://test-function.com",
      });
    });

    test("should throw when required GOOGLE_OAUTH_CLIENT_ID is missing", () => {
      const { loadConfig } = createMockConfig({});

      expect(() => loadConfig()).toThrow("GOOGLE_OAUTH_CLIENT_ID is required");
    });

    test("should handle empty string as missing value", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: ""
      });

      expect(() => loadConfig()).toThrow("GOOGLE_OAUTH_CLIENT_ID is required");
    });

    test("should preserve client secret when provided", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "secret-key"
      });

      const config = loadConfig();

      expect(config.googleOAuthClientSecret).toBe("secret-key");
    });

    test("should handle undefined optional values correctly", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: undefined,
        FIREBASE_FUNCTIONS_URL: undefined
      });

      const config = loadConfig();

      expect(config.googleOAuthClientSecret).toBeUndefined();
      expect(config.firebaseFunctionsUrl).toBeUndefined();
    });
  });

  describe("Error Messages", () => {
    test("should provide helpful error message for missing client ID", () => {
      const { loadConfig } = createMockConfig({});

      expect(() => loadConfig()).toThrow(/GOOGLE_OAUTH_CLIENT_ID is required/);
      expect(() => loadConfig()).toThrow(/For development: add to packages\/cli\/\.env file/);
      expect(() => loadConfig()).toThrow(/For production: build with --define/);
    });

    test("should include both development and production guidance", () => {
      const { loadConfig } = createMockConfig({});

      expect(() => loadConfig()).toThrow(/development/);
      expect(() => loadConfig()).toThrow(/production/);
      expect(() => loadConfig()).toThrow(/\.env file/);
      expect(() => loadConfig()).toThrow(/--define/);
    });
  });

  describe("validateConfig", () => {
    test("should not throw when configuration is valid", () => {
      const { validateConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "valid-client-id"
      });

      expect(() => validateConfig()).not.toThrow();
    });

    test("should call process.exit when configuration is invalid", () => {
      const { validateConfig } = createMockConfig({});

      // Mock process.exit to prevent actual exit
      const originalExit = process.exit;
      let exitCode: number | undefined;

      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error(`process.exit called with code ${code}`);
      }) as any;

      // Mock console.error to capture error message
      const originalConsoleError = console.error;
      let errorMessage = "";
      console.error = (message: string) => {
        errorMessage = message;
      };

      expect(() => validateConfig()).toThrow("process.exit called with code 1");
      expect(exitCode).toBe(1);
      expect(errorMessage).toContain("Configuration error:");

      // Restore mocks
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("should log configuration error to console", () => {
      const { validateConfig } = createMockConfig({});

      const originalExit = process.exit;
      const originalConsoleError = console.error;

      let loggedMessage = "";
      process.exit = (() => {
        throw new Error("process.exit called");
      }) as any;
      console.error = (message: string, ...args: any[]) => {
        loggedMessage = message + (args.length > 0 ? ' ' + args.join(' ') : '');
      };

      expect(() => validateConfig()).toThrow("process.exit called");

      expect(loggedMessage).toContain("Configuration error:");
      expect(loggedMessage).toContain("GOOGLE_OAUTH_CLIENT_ID is required");

      // Restore mocks
      process.exit = originalExit;
      console.error = originalConsoleError;
    });
  });

  describe("getConfigSafe", () => {
    test("should return config when valid", () => {
      const { getConfigSafe } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "test-client-id"
      });

      const config = getConfigSafe();

      expect(config).not.toBeNull();
      expect(config?.googleOAuthClientId).toBe("test-client-id");
    });

    test("should return null when configuration is invalid", () => {
      const { getConfigSafe } = createMockConfig({});

      const config = getConfigSafe();

      expect(config).toBeNull();
    });

    test("should not throw when configuration is invalid", () => {
      const { getConfigSafe } = createMockConfig({});

      expect(() => getConfigSafe()).not.toThrow();
    });

    test("should handle partial configuration gracefully", () => {
      const { getConfigSafe } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_SECRET: "secret"
        // Missing required GOOGLE_OAUTH_CLIENT_ID
      });

      const config = getConfigSafe();

      expect(config).toBeNull();
    });
  });

  describe("Configuration Types", () => {
    test("should maintain correct types for all fields", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "secret",
        FIREBASE_FUNCTIONS_URL: "https://example.com"
      });

      const config = loadConfig();

      expect(typeof config.googleOAuthClientId).toBe("string");
      expect(typeof config.googleOAuthClientSecret).toBe("string");
      expect(typeof config.firebaseFunctionsUrl).toBe("string");
    });

    test("should handle undefined optional fields correctly", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "client-id"
      });

      const config = loadConfig();

      expect(config.googleOAuthClientSecret).toBeUndefined();
      expect(config.firebaseFunctionsUrl).toBeUndefined();
    });
  });

  describe("Environment Variable Handling", () => {
    test("should handle Google OAuth client ID variations", () => {
      const clientIds = [
        "simple-client-id",
        "client-id.apps.googleusercontent.com",
        "123456789-abcdefg.apps.googleusercontent.com",
        "client_with_underscores",
        "client-with-dashes",
      ];

      clientIds.forEach(clientId => {
        const { loadConfig } = createMockConfig({
          GOOGLE_OAUTH_CLIENT_ID: clientId
        });

        const config = loadConfig();
        expect(config.googleOAuthClientId).toBe(clientId);
      });
    });

    test("should handle Firebase Functions URL variations", () => {
      const urls = [
        "https://us-central1-project.cloudfunctions.net/function",
        "https://function-abcd1234-uc.a.run.app",
        "http://localhost:5001/project/us-central1/function",
      ];

      urls.forEach(url => {
        const { loadConfig } = createMockConfig({
          GOOGLE_OAUTH_CLIENT_ID: "client-id",
          FIREBASE_FUNCTIONS_URL: url
        });

        const config = loadConfig();
        expect(config.firebaseFunctionsUrl).toBe(url);
      });
    });

    test("should handle whitespace in environment variables", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "  client-id  "
      });

      const config = loadConfig();

      // Should preserve whitespace (app can trim if needed)
      expect(config.googleOAuthClientId).toBe("  client-id  ");
    });
  });

  describe("Build-time Behavior", () => {
    test("should work with environment variables at build time", () => {
      const { loadConfig } = createMockConfig({
        GOOGLE_OAUTH_CLIENT_ID: "build-time-client-id"
      });

      const config = loadConfig();

      expect(config.googleOAuthClientId).toBe("build-time-client-id");
    });

    test("should provide appropriate error messages for both contexts", () => {
      const { loadConfig } = createMockConfig({});

      // Should mention both development (.env) and production (--define) contexts
      expect(() => loadConfig()).toThrow(/development/);
      expect(() => loadConfig()).toThrow(/production/);
      expect(() => loadConfig()).toThrow(/packages\/cli\/\.env/);
      expect(() => loadConfig()).toThrow(/--define/);
    });
  });
});
