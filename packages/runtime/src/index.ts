#!/usr/bin/env bun

/**
 * Overdrip Runtime - Main Entry Point
 *
 * This is the main application that runs on Raspberry Pi devices.
 * It handles device authentication, sensor monitoring, and actuator control.
 */

import { OverdripDeviceClient } from "@overdrip/core/client";

export class OverdripRuntime {
  private isRunning: boolean = false;

  constructor(private client: OverdripDeviceClient) { }

  /**
   * Start the runtime system
   */
  async start(): Promise<void> {
    console.log('🌱 Starting Overdrip Runtime...');
    console.log(`📍 Device: ${this.client.deviceName} (${this.client.deviceId})`);

    try {
      // Authenticate with the server
      console.log('🔐 Authenticating device...');
      await this.client.authenticate();

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
  }

  /**
   * Main runtime loop
   */
  private async runMainLoop(): Promise<void> {
    while (this.isRunning) {
      // TODO: Read sensors
      console.log('🔄 Reading sensors...');

      // TODO: Check watering schedules
      console.log('💧 Checking watering schedules...');

      // TODO: Upload telemetry
      console.log('📤 Uploading telemetry data...');

      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    }
    console.log('✅ Runtime stopped gracefully');
  }
}