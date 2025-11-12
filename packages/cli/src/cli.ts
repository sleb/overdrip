#! /usr/bin/env bun

import { helpPlugin } from "@clerc/plugin-help";
import type { CommandWithHandler } from "clerc";
import { Clerc, friendlyErrorPlugin, versionPlugin } from "clerc";
import { app } from "./app";
import { validateConfig } from "./config";

// Commands that require OAuth configuration
const OAUTH_COMMANDS = ["setup", "start"];

// Check if the current command requires OAuth
const args = process.argv.slice(2);
const command = args[0] || '';
const needsOAuth = OAUTH_COMMANDS.includes(command);

// Only validate OAuth configuration for commands that need it
if (needsOAuth) {
  validateConfig();
}

const setupCommand: CommandWithHandler = {
  name: "setup",
  description: "Setup a new device with Google OAuth authentication",
  handler() {
    app("setup");
  },
};

const startCommand: CommandWithHandler = {
  name: "start",
  description: "Start device operations (sensor data, configuration sync)",
  handler() {
    app("start");
  },
};

const configCommand: CommandWithHandler = {
  name: "config",
  description: "Manage device configuration",
  flags: {
    verify: {
      type: Boolean,
      description: "Verify the configuration file is valid",
    },
    show: {
      type: Boolean,
      description: "Display the current configuration",
    },
  },
  handler(context) {
    if (context.flags.verify) {
      app("config-verify");
    } else if (context.flags.show) {
      app("config-show");
    } else {
      // Default to show if no flags provided
      app("config-show");
    }
  },
};

const cli = Clerc.create()
  .name("overdrip")
  .version("0.1.0")
  .scriptName("overdrip")
  .description("Overdrip CLI - IoT plant watering system")
  .use(helpPlugin({
    showHelpWhenNoCommand: true,
    examples: [
      ["overdrip setup", "Set up device authentication"],
      ["overdrip config", "Show current configuration"],
      ["overdrip config --verify", "Validate configuration file"],
      ["overdrip start", "Start the device operations"]
    ]
  }))
  .use(versionPlugin())
  .use(friendlyErrorPlugin())
  .command(setupCommand)
  .command(startCommand)
  .command(configCommand);

cli.parse();
