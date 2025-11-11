#!/usr/bin/env bun

/**
 * Build script for Overdrip CLI
 * Compiles standalone executable with environment variable inlining
 */

import { $ } from "bun";
import { existsSync } from "node:fs";

interface BuildOptions {
  mode: "development" | "production";
  outFile?: string;
}

/**
 * Validate required environment variables for production builds
 */
function validateProductionEnv(): void {
  const required = ["GOOGLE_OAUTH_CLIENT_ID"];
  const optional = ["GOOGLE_OAUTH_CLIENT_SECRET"];
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables for production build:");
    for (const envVar of missing) {
      console.error(`   - ${envVar}`);
    }
    console.error("\nOptional environment variables:");
    for (const envVar of optional) {
      console.error(`   - ${envVar} (only needed for Web Application OAuth clients)`);
    }
    console.error("\nPlease set these environment variables and try again.");
    console.error("Example:");
    console.error("  export GOOGLE_OAUTH_CLIENT_ID=your_client_id");
    console.error("  export GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret  # Optional");
    console.error("  bun run cli:build:release");
    process.exit(1);
  }

  console.log("✅ All required environment variables are present");
}

/**
 * Compile the CLI executable with appropriate configuration
 */
async function build(options: BuildOptions): Promise<void> {
  const { mode, outFile = "overdrip" } = options;

  console.log(`🏗️  Compiling Overdrip CLI (${mode} mode)`);

  // Validate environment for production builds
  if (mode === "production") {
    validateProductionEnv();
  }

  // Base build command - use correct path when run from workspace root
  const buildArgs = ["build", "packages/cli/src/cli.ts", "--compile", "--outfile", `packages/cli/${outFile}`];

  // Add environment variable definitions for production
  if (mode === "production") {
    const envVars = {
      "process.env.GOOGLE_OAUTH_CLIENT_ID": JSON.stringify(process.env.GOOGLE_OAUTH_CLIENT_ID),
      "process.env.GOOGLE_OAUTH_CLIENT_SECRET": JSON.stringify(process.env.GOOGLE_OAUTH_CLIENT_SECRET),
      "process.env.NODE_ENV": JSON.stringify("production"),
    };

    for (const [key, value] of Object.entries(envVars)) {
      buildArgs.push("--define", `${key}=${value}`);
    }

    // Add optimization flags for production
    buildArgs.push("--minify");
  }

  try {
    // Run the build
    await $`bun ${buildArgs}`;

    console.log(`✅ Build completed successfully!`);
    console.log(`📦 Executable created: packages/cli/${outFile}`);

    // Make executable (on Unix systems)
    if (process.platform !== "win32") {
      await $`chmod +x packages/cli/${outFile}`;
      console.log(`🔧 Made executable: packages/cli/${outFile}`);
    }
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

/**
 * Clean build artifacts
 */
async function clean(): Promise<void> {
  console.log("🧹 Cleaning build artifacts...");

  const artifacts = ["packages/cli/overdrip", "packages/cli/overdrip.exe"];

  for (const artifact of artifacts) {
    if (existsSync(artifact)) {
      await $`rm -rf ${artifact}`;
      console.log(`   Removed: ${artifact}`);
    }
  }

  console.log("✅ Clean completed");
}

/**
 * Main CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "dev":
      await build({ mode: "development" });
      break;

    case "build":
      await build({ mode: "development" });
      break;

    case "build:release":
      await build({ mode: "production" });
      break;

    case "clean":
      await clean();
      break;

    default:
      console.log("Overdrip CLI Build Tool");
      console.log("");
      console.log("Usage:");
      console.log("  bun run build.ts <command>");
      console.log("");
      console.log("Commands:");
      console.log("  dev           Compile executable for development");
      console.log("  build         Compile executable for development");
      console.log("  build:release Compile executable for production (requires env vars)");
      console.log("  clean         Remove build artifacts");
      console.log("");
      console.log("Environment Variables:");
      console.log("  For development: Create packages/cli/.env file");
      console.log("  For production builds:");
      console.log("    GOOGLE_OAUTH_CLIENT_ID     Google OAuth 2.0 Client ID (required)");
      console.log("    GOOGLE_OAUTH_CLIENT_SECRET Google OAuth 2.0 Client Secret (required for your Desktop client)");
      process.exit(0);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("Build script failed:", error);
    process.exit(1);
  });
}
