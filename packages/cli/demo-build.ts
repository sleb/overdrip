#!/usr/bin/env bun

/**
 * Demo script showing environment variable inlining with Bun builds
 *
 * This demonstrates how environment variables are handled differently
 * in development vs production builds.
 */

import { loadConfig, getConfigSafe } from "./src/config";

console.log("🔧 Overdrip CLI - Environment Variable Demo");
console.log("=".repeat(50));

// Show current environment
console.log("\n📊 Current Environment:");
console.log(`NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);
console.log(`Runtime: ${typeof Bun !== "undefined" ? "Bun" : "Node.js"}`);

// Show raw environment variable
console.log("\n🔍 Raw Environment Variable:");
console.log(`process.env.GOOGLE_OAUTH_CLIENT_ID: ${process.env.GOOGLE_OAUTH_CLIENT_ID || "undefined"}`);

// Test configuration loading
console.log("\n⚙️  Configuration Loading:");
try {
  const config = loadConfig();
  console.log("✅ Configuration loaded successfully");
  console.log(`Client ID: ${config.googleOAuthClientId.substring(0, 20)}...`);
} catch (error) {
  console.log("❌ Configuration failed to load");
  console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
}

// Test safe configuration loading
console.log("\n🛡️  Safe Configuration Loading:");
const safeConfig = getConfigSafe();
if (safeConfig) {
  console.log("✅ Safe configuration loaded");
  console.log(`Client ID: ${safeConfig.googleOAuthClientId.substring(0, 20)}...`);
} else {
  console.log("❌ Safe configuration returned null");
}

// Show build-time vs runtime differences
console.log("\n🏗️  Build vs Runtime:");
if (process.env.NODE_ENV === "production") {
  console.log("📦 This is a PRODUCTION build");
  console.log("   - Environment variables were inlined at build time");
  console.log("   - No .env file loading occurs");
  console.log("   - Configuration is baked into the binary");
} else {
  console.log("🔧 This is a DEVELOPMENT build");
  console.log("   - Environment variables loaded from .env file");
  console.log("   - Runtime configuration loading");
  console.log("   - Flexible for development");
}

// Show what happens in different scenarios
console.log("\n📋 Build Scenarios:");
console.log("Development:");
console.log("  bun run demo-build.ts");
console.log("  → Uses .env file, flexible configuration");
console.log("");
console.log("Development Executable:");
console.log("  bun run build");
console.log("  → Standalone executable with .env support");
console.log("");
console.log("Production Executable:");
console.log("  GOOGLE_OAUTH_CLIENT_ID=xxx bun run build:release");
console.log("  → Standalone binary with embedded configuration");

console.log("\n" + "=".repeat(50));
console.log("🚀 Demo complete!");
