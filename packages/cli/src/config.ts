/**
 * Configuration utilities for CLI
 *
 * Environment variables are inlined at build time by Bun.
 * For development, use .env file. For production builds, variables
 * are baked into the binary with `bun build --define`.
 */

export interface CLIConfig {
  googleOAuthClientId: string;
}

// At build time, Bun will inline these environment variables
// Development: loaded from .env file
// Production: inlined via --define flags during build
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;

/**
 * Load configuration - validates at build time for production builds
 */
export function loadConfig(): CLIConfig {
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error(
      'GOOGLE_OAUTH_CLIENT_ID is required. ' +
      'For development: add to .env file. ' +
      'For production: build with --define GOOGLE_OAUTH_CLIENT_ID=your_client_id'
    );
  }

  return {
    googleOAuthClientId: GOOGLE_OAUTH_CLIENT_ID,
  };
}

/**
 * Validate configuration at startup
 * For production builds, this validates at compile time
 */
export function validateConfig(): void {
  try {
    loadConfig();
  } catch (error) {
    console.error('Configuration error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Get configuration without throwing - useful for conditional logic
 */
export function getConfigSafe(): CLIConfig | null {
  try {
    return loadConfig();
  } catch {
    return null;
  }
}
