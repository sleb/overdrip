/**
 * Configuration utilities for CLI
 *
 * Environment variables are inlined at build time by Bun.
 * For development, use .env file in CLI package directory. For production builds,
 * variables are baked into the binary with `bun build --define`.
 */

export interface CliConfig {
  googleOAuthClientId: string;
  googleOAuthClientSecret: string;
}

/**
 * Create configuration from provided values
 * This is the core logic separated from the environment variable source
 */
export const createConfig = (
  googleOAuthClientId: string,
  googleOAuthClientSecret: string,
): CliConfig => {
  if (!googleOAuthClientId || !googleOAuthClientSecret) {
    throw new Error("Invalid configuration: Google OAuth client ID and secret cannot be empty.");
  }

  return {
    googleOAuthClientId,
    googleOAuthClientSecret,
  };
};

// At build time, Bun will inline these environment variables
// Development: loaded from .env file in CLI package
// Production: inlined via --define flags during build
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;

/**
 * Load configuration from environment variables
 * Values are captured at module load time for build-time inlining
 */
export const loadConfig = (): CliConfig => {
  return createConfig(
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
  );
};
