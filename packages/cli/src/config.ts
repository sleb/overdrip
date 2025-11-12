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
  firebaseFunctionsUrl: string;
}

// At build time, Bun will inline these environment variables
// Development: loaded from .env file in CLI package
// Production: inlined via --define flags during build
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const FIREBASE_FUNCTIONS_URL = process.env.FIREBASE_FUNCTIONS_URL!;

/**
 * Load configuration - validates at build time for production builds
 */
export const loadConfig = (): CliConfig => {
  return {
    googleOAuthClientId: GOOGLE_OAUTH_CLIENT_ID,
    googleOAuthClientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
    firebaseFunctionsUrl: FIREBASE_FUNCTIONS_URL,
  };
};
