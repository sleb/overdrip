import os from "node:os";
import path from "node:path";
import { z } from "zod";

/**
 * Shared Device Configuration Schema
 *
 * This config is created by the CLI during setup and used by the runtime.
 * Both packages work with the same configuration file.
 */

const HardwareSensorConfigSchema = z.object({
  moisture: z.array(z.object({
    pin: z.number().int().min(0),
    location: z.string().optional(),
    calibration: z.object({
      dry: z.number(),
      wet: z.number(),
    }).optional()
  })).default([]),

  temperature: z.array(z.object({
    type: z.enum(['dht22', 'ds18b20']).default('dht22'),
    pin: z.number().int().min(0),
    location: z.string().optional(),
  })).default([]),

  light: z.array(z.object({
    pin: z.number().int().min(0),
    location: z.string().optional(),
  })).default([]),

  waterLevel: z.array(z.object({
    pin: z.number().int().min(0),
    location: z.string().default('tank'),
  })).default([]),
});

const HardwareActuatorConfigSchema = z.object({
  waterPump: z.object({
    pin: z.number().int().min(0),
    pwm: z.boolean().default(false),
    flowSensorPin: z.number().int().min(0).optional(),
  }).optional(),

  valves: z.array(z.object({
    pin: z.number().int().min(0),
    zone: z.string(),
    name: z.string().optional(),
  })).default([]),

  statusLeds: z.array(z.object({
    pin: z.number().int().min(0),
    color: z.enum(['red', 'green', 'blue', 'yellow']),
    purpose: z.enum(['status', 'error', 'watering', 'network']),
  })).default([]),
});

const WateringScheduleSchema = z.object({
  enabled: z.boolean().default(true),
  timezone: z.string().default('UTC'),
  schedules: z.array(z.object({
    name: z.string(),
    cron: z.string(), // Cron expression
    duration: z.number().min(1000), // milliseconds
    zones: z.array(z.string()).default([]), // Empty = all zones
    conditions: z.object({
      moistureThreshold: z.number().min(0).max(100).optional(),
      maxTemperature: z.number().optional(),
      minTemperature: z.number().optional(),
    }).default({})
  })).default([])
});

const SafetyConfigSchema = z.object({
  maxWateringDuration: z.number().min(1000).default(300000), // 5 minutes
  minTimeBetweenWatering: z.number().min(60000).default(1800000), // 30 minutes
  moistureThresholds: z.object({
    dry: z.number().min(0).max(100).default(30),
    wet: z.number().min(0).max(100).default(70),
  }).default({}),
  maxDailyWateringTime: z.number().min(60000).default(3600000), // 1 hour per day
  emergencyShutoff: z.object({
    enabled: z.boolean().default(true),
    maxFlowRate: z.number().optional(), // L/min
    leakDetectionTimeout: z.number().default(10000), // 10 seconds
  }).default({})
});

const TelemetryConfigSchema = z.object({
  intervals: z.object({
    sensorReading: z.number().min(1000).default(30000), // 30 seconds
    statusUpload: z.number().min(5000).default(60000), // 1 minute
    healthCheck: z.number().min(10000).default(300000), // 5 minutes
    configSync: z.number().min(60000).default(1800000), // 30 minutes
  }).default({}),
  batchSize: z.number().min(1).default(10),
  retryAttempts: z.number().min(0).default(3),
  retryDelayMs: z.number().min(1000).default(5000),
});

const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  console: z.boolean().default(true),
  file: z.boolean().default(true),
  filePath: z.string().default('~/.overdrip/runtime.log'),
  maxFileSize: z.number().default(10485760), // 10MB
  maxFiles: z.number().default(5),
});

export const DeviceConfigSchema = z.object({
  // Device identity (set by CLI during setup)
  deviceId: z.string().uuid(),
  deviceName: z.string().min(1).max(50),
  authCode: z.string().length(64).regex(/^[0-9a-f]+$/),

  // Setup metadata
  setupAt: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
  setupVersion: z.string(),
  lastModified: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),

  // Hardware configuration
  hardware: z.object({
    sensors: HardwareSensorConfigSchema,
    actuators: HardwareActuatorConfigSchema,
  }).default({ sensors: {}, actuators: {} }),

  // Watering system
  watering: WateringScheduleSchema,

  // Safety limits
  safety: SafetyConfigSchema,

  // Telemetry and monitoring
  telemetry: TelemetryConfigSchema.default({}),

  // Logging
  logging: LoggingConfigSchema.default({}),

  // User preferences
  preferences: z.object({
    units: z.enum(['metric', 'imperial']).default('metric'),
    language: z.string().default('en'),
    notifications: z.object({
      enabled: z.boolean().default(true),
      email: z.string().email().optional(),
      webhookUrl: z.string().url().optional(),
    }).default({})
  }).default({})
});

export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;

// Configuration file path (shared between CLI and runtime)
export const DEVICE_CONFIG_PATH = path.join(os.homedir(), '.overdrip', 'config.json');

/**
 * Load device configuration from the standard location
 * No fallbacks - if the file doesn't exist or is invalid, throw a clear error
 */
export const loadDeviceConfig = async (): Promise<DeviceConfig> => {
  const configPath = DEVICE_CONFIG_PATH;

  try {
    const file = Bun.file(configPath);

    if (!(await file.exists())) {
      throw new Error(
        `Device configuration not found at: ${configPath}\n` +
        `Run 'overdrip setup' to create the configuration file.`
      );
    }

    const content = await file.text();
    let data: unknown;

    try {
      data = JSON.parse(content);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON in configuration file: ${configPath}\n` +
        `Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}\n` +
        `Fix the JSON syntax or run 'overdrip setup' to recreate the file.`
      );
    }

    try {
      return DeviceConfigSchema.parse(data);
    } catch (validationError) {
      throw new Error(
        `Invalid configuration format in: ${configPath}\n` +
        `Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}\n` +
        `Run 'overdrip setup' to recreate the configuration file.`
      );
    }

  } catch (error) {
    // Re-throw our custom errors as-is, wrap other errors
    if (error instanceof Error && error.message.includes('overdrip setup')) {
      throw error;
    }

    throw new Error(
      `Failed to load device configuration from: ${configPath}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}\n` +
      `Check file permissions and try running 'overdrip setup' if the problem persists.`
    );
  }
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
 * Create a minimal device configuration for initial setup
 */
export const createMinimalDeviceConfig = (
  deviceId: string,
  deviceName: string,
  authCode: string
): DeviceConfig => {
  const now = new Date();

  return DeviceConfigSchema.parse({
    deviceId,
    deviceName,
    authCode,
    setupAt: now,
    setupVersion: '0.1.0',
    lastModified: now,
    watering: {
      enabled: false, // Start with watering disabled for safety
      schedules: []
    },
    safety: {
      moistureThresholds: {
        dry: 30,
        wet: 70,
      }
    }
  });
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
