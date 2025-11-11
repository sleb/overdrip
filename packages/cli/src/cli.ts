#! /usr/bin/env bun

import { Clerc } from "clerc";
import { validateConfig } from "./config";
import { app } from "./app";
import type { CommandWithHandler } from "clerc";

// Validate configuration before running any commands
validateConfig();

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

Clerc.create()
  .name("overdrip")
  .version("0.1.0")
  .scriptName("overdrip")
  .description("Overdrip CLI - IoT plant watering system")
  .command(setupCommand)
  .command(startCommand)
  .parse();
