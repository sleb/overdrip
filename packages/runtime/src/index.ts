#!/usr/bin/env bun

/**
 * Overdrip Runtime - Main Entry Point
 *
 * This is the main application that runs on Raspberry Pi devices.
 * It handles device authentication, sensor monitoring, and actuator control.
 */

import { loadDeviceConfig, OverdripDeviceClient, type DeviceConfig } from '@overdrip/core';

class OverdripRuntime {
  private client: OverdripDeviceClient;
  private config: DeviceConfig;
  private isRunning: boolean = false;

  constructor(config: DeviceConfig) {
    this.config = config;
    this.client = new OverdripDeviceClient({
      authCode: config.authCode,
      deviceId: config.deviceId,
      deviceName: config.deviceName,
    });
  }

  /**
   * Start the runtime system
   */
  async start(): Promise<void> {
    console.log('🌱 Starting Overdrip Runtime...');
    console.log(`📍 Device: ${this.config.deviceName} (${this.config.deviceId})`);

    try {
      // Authenticate with the server
      console.log('🔐 Authenticating device...');
      await this.client.authenticate();

      // Set up command listening (stub)
      this.setupCommandHandling();

      // Set up config update listening (stub)
      this.setupConfigHandling();

      // Start main loop
      this.isRunning = true;
      console.log('✅ Runtime started successfully');

      // Start the main loop
      await this.runMainLoop();

    } catch (error) {
      console.error('❌ Failed to start runtime:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the runtime system
   */
  async stop(): Promise<void> {
    console.log('⏹️  Stopping Overdrip Runtime...');
    this.isRunning = false;

    try {
      await this.client.disconnect();
      console.log('✅ Runtime stopped gracefully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Main runtime loop
   */
  private async runMainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // TODO: Read sensors
        await this.readSensors();

        // TODO: Check watering schedules
        await this.checkWateringSchedule();

        // TODO: Upload telemetry
        await this.uploadTelemetry();

        // Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

      } catch (error) {
        console.error('💥 Error in main loop:', error);
        // Continue running but wait a bit longer
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
      }
    }
  }

  /**
   * Read sensor data (stub)
   */
  private async readSensors(): Promise<void> {
    console.log('📊 [STUB] Reading sensors...');

    // TODO: Implement actual sensor reading
    const mockReading = {
      deviceId: this.config.deviceId,
      sensorType: 'moisture' as const,
      value: Math.random() * 100,
      unit: '%',
      timestamp: new Date(),
      location: 'probe-1'
    };

    // Upload to server (using stub)
    await this.client.uploadSensorReading(mockReading);
  }

  /**
   * Check watering schedule (stub)
   */
  private async checkWateringSchedule(): Promise<void> {
    console.log('💧 [STUB] Checking watering schedule...');
    // TODO: Implement watering logic
  }

  /**
   * Upload telemetry data (stub)
   */
  private async uploadTelemetry(): Promise<void> {
    console.log('📡 [STUB] Uploading telemetry...');

    // TODO: Implement actual telemetry collection
    const mockStatus = {
      deviceId: this.config.deviceId,
      status: 'online' as const,
      uptime: process.uptime(),
      lastSeen: new Date(),
      version: this.config.setupVersion
    };

    await this.client.uploadDeviceStatus(mockStatus);
  }

  /**
   * Set up command handling (stub)
   */
  private setupCommandHandling(): void {
    this.client.onCommand((command) => {
      console.log('🎮 Received command:', command);
      // TODO: Implement command handling
    });
  }

  /**
   * Set up config update handling (stub)
   */
  private setupConfigHandling(): void {
    this.client.onConfigUpdate((config) => {
      console.log('⚙️ Config updated:', config);
      // TODO: Implement config update handling
    });
  }
}

/**
 * Main function
 */
const main = async (): Promise<void> => {
  console.log('🚀 Overdrip Runtime v0.1.0');

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    if (runtime) {
      await runtime.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Load configuration
  let config: DeviceConfig;
  try {
    config = await loadDeviceConfig();
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    process.exit(1);
  }

  // Create and start runtime
  const runtime = new OverdripRuntime(config);
  await runtime.start();
};

// Run if this is the main module
if (import.meta.main) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}
