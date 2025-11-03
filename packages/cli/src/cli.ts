#! /usr/bin/env bun

import { Clerc } from "clerc";
import { setupCommand } from "./setup.tsx";

Clerc.create()
  .name("overdrip")
  .version("0.1.0")
  .scriptName("overdrip")
  .description("Overdrip CLI")
  .command(setupCommand)
  .parse();
