#! /usr/bin/env bun

import { helpPlugin } from "@clerc/plugin-help";
import type { CommandWithHandler } from "clerc";
import { Clerc, friendlyErrorPlugin, versionPlugin } from "clerc";
import { name, version } from "../package.json";
import { app } from "./app";

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
  description: "Show device configuration",
  handler() {
    app("config:show");
  }
};

const configVerifyCommand: CommandWithHandler = {
  name: "config:verify",
  description: "Verify the device configuration file",
  handler() {
    app("config:verify");
  }
};

const cli = Clerc.create()
  .name(name)
  .scriptName("overdrip")
  .version(version)
  .description("Overdrip - IoT plant watering system")
  .use(helpPlugin({
    showHelpWhenNoCommand: true,
  }))
  .use(versionPlugin())
  .use(friendlyErrorPlugin())
  .command(setupCommand)
  .command(startCommand)
  .command(configCommand)
  .command(configVerifyCommand);

cli.parse();
