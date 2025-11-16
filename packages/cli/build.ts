#!/usr/bin/env bun

/**
 * Build script for Overdrip CLI
 * Compiles standalone executable with environment variable inlining
 */

import { $ } from "bun";
import { parseArgs } from "node:util";
import { loadGoogleOauthConfig } from "./src/oauth-setup";

/**
 * Validate required environment variables for production builds
 */
const validateEnv = () => {
  try {
    // TODO: abstract to other OAuth providers if needed
    loadGoogleOauthConfig();
  } catch (e) {
    console.error("❌ Error loading configuration:", e);
    process.exit(1);
  }

  console.log("✅ All required environment variables are present");
};

/**
 * Compile the CLI executable with appropriate configuration
 */
const build = async (): Promise<void> => {
  console.log("🏗️  Compiling Overdrip CLI");
  validateEnv();

  const result = await Bun.build({
    entrypoints: ["src/cli.ts"],
    outdir: "dist",
    minify: true,
    target: "bun",
    env: "inline"
  });

  if (!result.success) {
    console.error("❌ Build failed");
    process.exit(1);
  }

  console.log("✅ Build completed successfully!");
  for (const output of result.outputs) {
    console.log(`  📦 Created: ${output.path}`);
  }
};

/**
 * Clean build artifacts
 */
const clean = async (): Promise<void> => {
  console.log("🧹 Cleaning build artifacts...");
  const artifacts = ["dist"];

  for (const artifact of artifacts) {
    console.log(`  🗑️  Removing ${artifact}...`);
    await $`rm -rf ${artifact}`;
  }

  console.log("✅ Clean completed");
};

const help = () => {
  console.log("Overdrip CLI Build Tool");
  console.log("");
  console.log("Usage:");
  console.log("  bun run build.ts [options] <command>");
  console.log("");
  console.log("Options:");
  console.log("  -h, --help    Show this help message");
  console.log("");
  console.log("Commands:");
  console.log("  build         Build Overdrip CLI (default)");
  console.log("  clean         Remove build artifacts");
  console.log("  help          Show this help message");
  console.log("");
};

/**
 * Main CLI interface
 */
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const command = args[0] || "";

  switch (command) {
    case "clean":
      await clean();
      break;

    case "help":
      help();
      break;

    case "build":
    case "":
      await build();
      break;


    default:
      const { values } = parseArgs({ args, strict: false, options: { help: { type: "boolean", short: "h" } } });
      if (values.help) {
        help();
        return;
      }

      console.error(`❌ Unknown command: ${command}`);
      help();
      process.exit(1);
  }
};

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("Build script failed:", error);
    process.exit(1);
  });
}
