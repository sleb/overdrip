/**
 * Overdrip Core SDK
 *
 * Main entry point for the Overdrip device SDK.
 * Provides device authentication and cloud APIs while abstracting Firebase details.
 */

// Main SDK Client
export { OverdripDeviceClient } from './client/device-client';
export type { DeviceClientOptions } from './client/device-client';

// Type definitions
export type {
  CommandResult, DeviceCommand, DeviceError, DeviceHealth, DeviceStatus, SensorReading
} from './types/index';

// Device configuration
export {
  createMinimalDeviceConfig, DEVICE_CONFIG_PATH, deviceConfigExists, DeviceConfigSchema, getDeviceConfigPath, loadDeviceConfig,
  saveDeviceConfig
} from './device-config';
export type { DeviceConfig } from './device-config';

// Legacy exports for existing packages
export * from './config';
export * from './schemas';

// Note: Firebase internals are not exported - use OverdripDeviceClient instead
