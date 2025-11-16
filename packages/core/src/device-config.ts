import { file } from "bun";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

/**
 * Shared Device Configuration Schema
 *
 * This config is created by the CLI during setup and used by the runtime.
 * Both packages work with the same configuration file.
 */
export const DeviceConfigSchema = z.object({
  // Custom token URL
  customTokenUrl: z.string().url().default("https://us-central1-overdrip-ed767.cloudfunctions.net/refreshDeviceToken"),
  // Device identity (set by CLI during setup)
  deviceId: z.string().uuid(),
  deviceName: z.string().min(1).max(50),
  authCode: z.string().length(64).regex(/^[0-9a-f]+$/),

  // Setup metadata
  setupAt: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
  setupVersion: z.string(),
  lastModified: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
});

export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;

// Configuration file path (shared between CLI and runtime)
export const DEVICE_CONFIG_PATH = path.join(os.homedir(), '.overdrip', 'config.json');

/**
 * Load device configuration from the standard location
 */
export const loadDeviceConfig = async (): Promise<DeviceConfig | null> => {
  const configPath = DEVICE_CONFIG_PATH;

  const configFile = file(configPath);

  if ((await configFile.exists())) {
    try {
      const content = await configFile.text();
      let data = JSON.parse(content);

      return DeviceConfigSchema.parse(data);
    } catch (e) {
      throw new Error(
        `Invalid configuration format in: ${configPath}\n` +
        `Validation error: ${e instanceof Error ? e.message : String(e)}\n` +
        `Run 'overdrip setup' to recreate the configuration file.`
      );
    }
  }

  return null;

};

/**
 * Save device configuration to the standard location
 * Creates the directory if it doesn't exist
 */
export const saveDeviceConfig = async (config: DeviceConfig): Promise<void> => {
  const configPath = DEVICE_CONFIG_PATH;

  try {
    // Validate the config before saving
    const validatedConfig = DeviceConfigSchema.parse(config);

    // Update lastModified timestamp
    validatedConfig.lastModified = new Date();

    // Ensure directory exists
    const configDir = path.dirname(configPath);
    await Bun.write(path.join(configDir, '.keep'), ''); // Creates directory

    // Write config file with restricted permissions
    const configJson = JSON.stringify(validatedConfig, null, 2);
    await Bun.write(configPath, configJson, { mode: 0o600 });

    console.log(`✅ Device configuration saved to: ${configPath}`);

  } catch (error) {
    throw new Error(
      `Failed to save device configuration to: ${configPath}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Check if device configuration exists
 */
export const deviceConfigExists = async (): Promise<boolean> => {
  const file = Bun.file(DEVICE_CONFIG_PATH);
  return await file.exists();
};

/**
 * Get the configuration file path (for display/debugging)
 */
export const getDeviceConfigPath = (): string => {
  return DEVICE_CONFIG_PATH;
};
