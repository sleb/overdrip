# Overdrip Runtime

The Overdrip Runtime is the main application that runs continuously on Raspberry Pi devices in the Overdrip IoT plant watering system. It handles device authentication, sensor monitoring, actuator control, and communication with the Overdrip cloud services.

## Architecture

The runtime is built on top of the `@overdrip/core` SDK, which abstracts all Firebase interactions and provides a clean device API. This allows the runtime to focus on IoT device logic without being tightly coupled to Firebase implementation details.

### Key Components

- **Device Authentication**: Uses the hybrid auth system with long-lived device auth codes
- **Sensor Management**: Reads and processes sensor data (moisture, temperature, etc.)
- **Actuator Control**: Controls water pumps, valves, and other hardware
- **Telemetry**: Uploads sensor data and device status to the cloud
- **Configuration**: Receives and applies remote configuration updates
- **Command Handling**: Processes remote commands (manual watering, calibration, etc.)

## Installation & Setup

### Prerequisites

- Raspberry Pi with Bun runtime installed
- Device must be registered using the Overdrip CLI
- Hardware sensors and actuators connected

### Setup Process

1. **Register Device** (one-time setup):
   ```bash
   # On any machine with the CLI
   overdrip setup
   # Follow the OAuth flow and device registration
   ```

2. **Transfer Configuration** to Pi:
   ```bash
   # Copy the auth file to the Pi
   scp ~/.overdrip/auth.json pi@your-pi:~/.overdrip/
   ```

3. **Install Runtime** on Pi:
   ```bash
   # Clone and install
   git clone <repository>
   cd overdrip/packages/runtime
   bun install
   ```

4. **Start Runtime**:
   ```bash
   bun start
   # Or for development with hot reload:
   bun dev
   ```

## Configuration

The runtime loads configuration from a single, well-defined location:

- **Configuration file**: `~/.overdrip/config.json`

This configuration is created by the CLI during setup (`overdrip setup`) and shared between the CLI and runtime. There are no fallbacks - if the configuration file doesn't exist or is invalid, the runtime will exit with a clear error message telling you exactly what to do.

### Configuration Schema

The configuration file is created and managed by the CLI. Here's the full schema:

```typescript
interface DeviceConfig {
  // Device identity (set by CLI during setup)
  deviceId: string;
  deviceName: string;
  authCode: string;

  // Setup metadata
  setupAt: Date;
  setupVersion: string;
  lastModified: Date;

  // Hardware configuration
  hardware: {
    sensors: {
      moisture: Array<{
        pin: number;
        location?: string;
        calibration?: { dry: number; wet: number; };
      }>;
      temperature: Array<{
        type: 'dht22' | 'ds18b20';
        pin: number;
        location?: string;
      }>;
      light: Array<{ pin: number; location?: string; }>;
      waterLevel: Array<{ pin: number; location?: string; }>;
    };
    actuators: {
      waterPump?: {
        pin: number;
        pwm: boolean;
        flowSensorPin?: number;
      };
      valves: Array<{ pin: number; zone: string; name?: string; }>;
      statusLeds: Array<{ pin: number; color: string; purpose: string; }>;
    };
  };

  // Watering schedules
  watering: {
    enabled: boolean;
    timezone: string;
    schedules: Array<{
      name: string;
      cron: string;
      duration: number;
      zones: string[];
      conditions: { moistureThreshold?: number; maxTemperature?: number; };
    }>;
  };

  // Safety limits
  safety: {
    maxWateringDuration: number;     // 5 minutes max
    minTimeBetweenWatering: number;  // 30 minutes min
    moistureThresholds: { dry: number; wet: number; };
    maxDailyWateringTime: number;    // 1 hour per day
    emergencyShutoff: { enabled: boolean; maxFlowRate?: number; };
  };

  // Telemetry and monitoring
  telemetry: {
    intervals: {
      sensorReading: number;   // 30 seconds default
      statusUpload: number;    // 1 minute default
      healthCheck: number;     // 5 minutes default
      configSync: number;      // 30 minutes default
    };
    batchSize: number;
    retryAttempts: number;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    console: boolean;
    file: boolean;
    filePath: string;
    maxFileSize: number;
    maxFiles: number;
  };

  // User preferences
  preferences: {
    units: 'metric' | 'imperial';
    language: string;
    notifications: {
      enabled: boolean;
      email?: string;
      webhookUrl?: string;
    };
  };
}
```

### Configuration Management

The configuration file is managed entirely by the CLI:

- **Created by**: `overdrip setup` (during initial device registration)
- **Updated by**: CLI commands for hardware setup, schedule management, etc.
- **Read by**: Runtime during startup and operation

**No manual editing required** - use CLI commands to modify configuration.

## Usage

### Basic Operation

The runtime follows this lifecycle:

1. **Startup**: Load configuration and authenticate with cloud services
2. **Main Loop**: Continuously read sensors, check schedules, upload data
3. **Command Handling**: Process remote commands asynchronously
4. **Shutdown**: Graceful cleanup on SIGINT/SIGTERM

### Development

```bash
# Start with hot reload
bun dev

# Test with mock configuration
bun src/simple-runtime.ts

# Run tests
bun test
```

### Production Deployment

```bash
# Start as system service
sudo systemctl start overdrip-runtime

# View logs
sudo journalctl -u overdrip-runtime -f

# Check status
sudo systemctl status overdrip-runtime
```

## API Integration

The runtime uses the `@overdrip/core` SDK for all cloud interactions:

```typescript
import { OverdripDeviceClient, loadDeviceConfig } from '@overdrip/core';

// Load shared configuration (same file used by CLI)
const config = await loadDeviceConfig();

const client = new OverdripDeviceClient({
  authCode: config.authCode,
  deviceId: config.deviceId,
  deviceName: config.deviceName,
});

// Authenticate once at startup
await client.authenticate();

// Upload sensor data
await client.uploadSensorReading({
  deviceId: config.deviceId,
  sensorType: 'moisture',
  value: 45.2,
  unit: '%',
  timestamp: new Date()
});

// Listen for commands
client.onCommand(async (command) => {
  switch (command.type) {
    case 'water_now':
      await wateringSystem.waterNow(command.parameters);
      await client.acknowledgeCommand(command.id, { success: true });
      break;
  }
});
```

## Current Implementation Status

### ✅ Completed
- Core SDK integration with authentication
- Basic runtime structure and configuration
- Minimal command and telemetry stubs
- Graceful startup/shutdown handling
- Configuration management with validation

### 🚧 In Progress / TODO
- Hardware sensor implementations
- Actuator control systems
- Watering schedule logic
- Health monitoring and diagnostics
- Error recovery mechanisms
- System service configuration
- Production deployment scripts

### 🔮 Future Features
- Machine learning for optimal watering
- Weather API integration
- Mobile notifications
- Firmware over-the-air updates
- Multi-device coordination

## Hardware Support

Currently designed for Raspberry Pi with the following sensor/actuator support planned:

- **Moisture Sensors**: Capacitive soil moisture probes
- **Temperature/Humidity**: DHT22, DS18B20
- **Water Pumps**: 12V pumps with relay control
- **Solenoid Valves**: Multi-zone watering systems
- **Flow Sensors**: Water usage monitoring
- **pH Sensors**: Soil/water quality monitoring

## Troubleshooting

### Common Issues

1. **Configuration Not Found**:
   ```
   Device configuration not found at: /home/pi/.overdrip/config.json
   Run 'overdrip setup' to create the configuration file.
   ```
   **Solution**: Run `overdrip setup` on any machine, then copy the config file to the Pi.

2. **Authentication Failed**:
   - Ensure device is registered with `overdrip setup`
   - Check auth code hasn't expired (1 year default)
   - Verify network connectivity to Cloud Functions

3. **Invalid Configuration**:
   ```
   Invalid configuration format in: /home/pi/.overdrip/config.json
   Validation error: [specific error details]
   Run 'overdrip setup' to recreate the configuration file.
   ```
   **Solution**: Don't edit config manually - use CLI commands or run `overdrip setup` again.

4. **Sensor Reading Errors**:
   - Check GPIO pin configuration in config
   - Verify hardware connections
   - Review sensor calibration values

### Logs

Logs are written to:
- Console (if `logging.console: true` in config)
- File: configured path (default `~/.overdrip/runtime.log`)
- System journal: `journalctl -u overdrip-runtime`

Log configuration is managed via the CLI - no manual editing needed.

### Debug Mode

```bash
# Check configuration
overdrip status

# Test with mock configuration (will fail auth as expected)
echo '{"deviceId":"test-123","deviceName":"Test","authCode":"'$(openssl rand -hex 32)'","setupAt":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","setupVersion":"0.1.0","lastModified":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","watering":{"enabled":false,"schedules":[]},"safety":{"moistureThresholds":{"dry":30,"wet":70}}}' > ~/.overdrip/config.json

# Run runtime (will fail with mock config, but tests the loading)
bun src/index.ts
```

## Contributing

The runtime is designed to be modular and extensible:

- Sensor drivers implement the `BaseSensor` interface
- Actuators implement the `BaseActuator` interface
- All cloud communication goes through the `@overdrip/core` SDK
- Configuration uses Zod schemas for validation

See the main repository documentation for development guidelines.

## License

See LICENSE file in the repository root.
