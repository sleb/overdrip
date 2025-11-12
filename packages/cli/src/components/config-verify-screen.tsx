import React from 'react';
import { Text, Box, Newline } from 'ink';
import {
  loadDeviceConfig,
  deviceConfigExists,
  getDeviceConfigPath,
  type DeviceConfig
} from '@overdrip/core/device-config';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

const ConfigVerifyScreen = () => {
  const [result, setResult] = React.useState<ValidationResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const verifyConfig = async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        info: []
      };

      try {
        // Check if config file exists
        if (!(await deviceConfigExists())) {
          validationResult.isValid = false;
          validationResult.errors.push(`Configuration file not found at: ${getDeviceConfigPath()}`);
          validationResult.info.push("Run 'overdrip setup' to create a configuration file");
          setResult(validationResult);
          setLoading(false);
          return;
        }

        validationResult.info.push(`✓ Configuration file exists at: ${getDeviceConfigPath()}`);

        // Try to load and parse the config
        let config: DeviceConfig;
        try {
          config = await loadDeviceConfig();
          validationResult.info.push("✓ Configuration file is valid JSON");
          validationResult.info.push("✓ Configuration schema validation passed");
        } catch (err) {
          validationResult.isValid = false;
          validationResult.errors.push(`Configuration validation failed: ${err instanceof Error ? err.message : String(err)}`);
          setResult(validationResult);
          setLoading(false);
          return;
        }

        // Additional validation checks

        // Check device identity
        if (config.deviceId && config.deviceName && config.authCode) {
          validationResult.info.push("✓ Device identity is complete");
        } else {
          validationResult.isValid = false;
          validationResult.errors.push("Device identity is incomplete (missing deviceId, deviceName, or authCode)");
        }

        // Check auth code format
        if (config.authCode.length === 64 && /^[0-9a-f]+$/.test(config.authCode)) {
          validationResult.info.push("✓ Auth code format is valid");
        } else {
          validationResult.isValid = false;
          validationResult.errors.push("Auth code format is invalid (should be 64 hex characters)");
        }

        // Check dates
        const now = new Date();
        if (config.setupAt && config.setupAt <= now) {
          validationResult.info.push("✓ Setup date is valid");
        } else {
          validationResult.warnings.push("Setup date appears to be in the future");
        }

        if (config.lastModified && config.lastModified <= now) {
          validationResult.info.push("✓ Last modified date is valid");
        } else {
          validationResult.warnings.push("Last modified date appears to be in the future");
        }

        // Check safety configuration
        if (config.safety.maxWateringDuration > 0 && config.safety.minTimeBetweenWatering > 0) {
          validationResult.info.push("✓ Safety limits are configured");
        } else {
          validationResult.warnings.push("Safety limits may not be properly configured");
        }

        if (config.safety.moistureThresholds.dry < config.safety.moistureThresholds.wet) {
          validationResult.info.push("✓ Moisture thresholds are logically correct");
        } else {
          validationResult.warnings.push("Moisture thresholds may be inverted (dry >= wet)");
        }

        // Check hardware configuration
        const totalSensors = config.hardware.sensors.moisture.length +
                            config.hardware.sensors.temperature.length +
                            config.hardware.sensors.light.length +
                            config.hardware.sensors.waterLevel.length;

        if (totalSensors > 0) {
          validationResult.info.push(`✓ ${totalSensors} sensor(s) configured`);
        } else {
          validationResult.warnings.push("No sensors are configured");
        }

        if (config.hardware.actuators.waterPump || config.hardware.actuators.valves.length > 0) {
          validationResult.info.push("✓ Water delivery system is configured");
        } else {
          validationResult.warnings.push("No water pump or valves configured");
        }

        // Check watering configuration
        if (config.watering.enabled && config.watering.schedules.length === 0) {
          validationResult.warnings.push("Watering is enabled but no schedules are configured");
        }

        if (!config.watering.enabled) {
          validationResult.info.push("ℹ Watering is disabled (safe default)");
        }

        // Check telemetry intervals
        if (config.telemetry.intervals.sensorReading >= 1000) {
          validationResult.info.push("✓ Sensor reading interval is reasonable");
        } else {
          validationResult.warnings.push("Sensor reading interval may be too frequent (< 1 second)");
        }

        // GPIO pin conflict detection
        const usedPins: number[] = [];
        const pinConflicts: string[] = [];

        // Collect all used pins
        config.hardware.sensors.moisture.forEach(sensor => usedPins.push(sensor.pin));
        config.hardware.sensors.temperature.forEach(sensor => usedPins.push(sensor.pin));
        config.hardware.sensors.light.forEach(sensor => usedPins.push(sensor.pin));
        config.hardware.sensors.waterLevel.forEach(sensor => usedPins.push(sensor.pin));

        if (config.hardware.actuators.waterPump) {
          usedPins.push(config.hardware.actuators.waterPump.pin);
          if (config.hardware.actuators.waterPump.flowSensorPin) {
            usedPins.push(config.hardware.actuators.waterPump.flowSensorPin);
          }
        }

        config.hardware.actuators.valves.forEach(valve => usedPins.push(valve.pin));
        config.hardware.actuators.statusLeds.forEach(led => usedPins.push(led.pin));

        // Check for duplicates
        const pinCounts = usedPins.reduce((acc, pin) => {
          acc[pin] = (acc[pin] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        Object.entries(pinCounts).forEach(([pin, count]) => {
          if (count > 1) {
            pinConflicts.push(`GPIO pin ${pin} is used by ${count} components`);
          }
        });

        if (pinConflicts.length > 0) {
          validationResult.warnings.push(...pinConflicts);
        } else if (usedPins.length > 0) {
          validationResult.info.push("✓ No GPIO pin conflicts detected");
        }

        setResult(validationResult);
      } catch (err) {
        validationResult.isValid = false;
        validationResult.errors.push(`Verification failed: ${err instanceof Error ? err.message : String(err)}`);
        setResult(validationResult);
      } finally {
        setLoading(false);
      }
    };

    verifyConfig();
  }, []);

  if (loading) {
    return (
      <Box>
        <Text color="blue">🔍 Verifying configuration...</Text>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box>
        <Text color="red">❌ Verification failed unexpectedly</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color={result.isValid ? "green" : "red"} bold>
        {result.isValid ? "✅ Configuration is valid" : "❌ Configuration has errors"}
      </Text>
      <Newline />

      {/* Errors */}
      {result.errors.length > 0 && (
        <>
          <Text color="red" bold>🚨 Errors:</Text>
          <Box marginLeft={2} flexDirection="column">
            {result.errors.map((error, index) => (
              <Text key={index} color="red">• {error}</Text>
            ))}
          </Box>
          <Newline />
        </>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <>
          <Text color="yellow" bold>⚠️  Warnings:</Text>
          <Box marginLeft={2} flexDirection="column">
            {result.warnings.map((warning, index) => (
              <Text key={index} color="yellow">• {warning}</Text>
            ))}
          </Box>
          <Newline />
        </>
      )}

      {/* Info */}
      {result.info.length > 0 && (
        <>
          <Text color="green" bold>ℹ️  Validation Details:</Text>
          <Box marginLeft={2} flexDirection="column">
            {result.info.map((info, index) => (
              <Text key={index} color="gray">• {info}</Text>
            ))}
          </Box>
          <Newline />
        </>
      )}

      {/* Summary and recommendations */}
      {result.isValid ? (
        <Text color="green">🎉 Your configuration is ready for use!</Text>
      ) : (
        <>
          <Text color="red">🔧 Please fix the errors above before using the runtime.</Text>
          <Text color="gray">💡 Run 'overdrip setup' to recreate the configuration file.</Text>
        </>
      )}
    </Box>
  );
};

export default ConfigVerifyScreen;
