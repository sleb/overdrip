import React from 'react';
import { Text, Box, Newline } from 'ink';
import {
  loadDeviceConfig,
  deviceConfigExists,
  getDeviceConfigPath,
  type DeviceConfig
} from '@overdrip/core/device-config';

const ConfigShowScreen = () => {
  const [config, setConfig] = React.useState<DeviceConfig | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        if (!(await deviceConfigExists())) {
          setError(`Configuration file not found at: ${getDeviceConfigPath()}`);
          setLoading(false);
          return;
        }

        const deviceConfig = await loadDeviceConfig();
        setConfig(deviceConfig);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (loading) {
    return (
      <Box>
        <Text color="blue">📄 Loading configuration...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">❌ Error loading configuration:</Text>
        <Text>{error}</Text>
        <Newline />
        <Text color="gray">💡 Run 'overdrip setup' to create a configuration file</Text>
      </Box>
    );
  }

  if (!config) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">⚠️  No configuration found</Text>
        <Text color="gray">Run 'overdrip setup' to create a configuration file</Text>
      </Box>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  const maskAuthCode = (authCode: string) => {
    return `${authCode.substring(0, 8)}...${authCode.substring(-8)}`;
  };

  return (
    <Box flexDirection="column">
      <Text color="green">✅ Device Configuration</Text>
      <Text color="gray">📁 {getDeviceConfigPath()}</Text>
      <Newline />

      {/* Device Identity */}
      <Text color="cyan" bold>🏷️  Device Identity</Text>
      <Box marginLeft={2}>
        <Box flexDirection="column">
          <Text>Name: <Text color="white" bold>{config.deviceName}</Text></Text>
          <Text>ID: <Text color="gray">{config.deviceId}</Text></Text>
          <Text>Auth Code: <Text color="gray">{maskAuthCode(config.authCode)}</Text></Text>
        </Box>
      </Box>
      <Newline />

      {/* Setup Information */}
      <Text color="cyan" bold>📅 Setup Information</Text>
      <Box marginLeft={2}>
        <Box flexDirection="column">
          <Text>Setup At: <Text color="white">{formatDate(config.setupAt)}</Text></Text>
          <Text>Setup Version: <Text color="white">{config.setupVersion}</Text></Text>
          <Text>Last Modified: <Text color="white">{formatDate(config.lastModified)}</Text></Text>
        </Box>
      </Box>
      <Newline />

      {/* Hardware Configuration */}
      <Text color="cyan" bold>🔧 Hardware</Text>
      <Box marginLeft={2}>
        <Box flexDirection="column">
          <Text>Moisture Sensors: <Text color="white">{config.hardware.sensors.moisture.length}</Text></Text>
          <Text>Temperature Sensors: <Text color="white">{config.hardware.sensors.temperature.length}</Text></Text>
          <Text>Light Sensors: <Text color="white">{config.hardware.sensors.light.length}</Text></Text>
          <Text>Water Level Sensors: <Text color="white">{config.hardware.sensors.waterLevel.length}</Text></Text>
          <Text>Water Pump: <Text color="white">{config.hardware.actuators.waterPump ? 'Configured' : 'Not configured'}</Text></Text>
          <Text>Valves: <Text color="white">{config.hardware.actuators.valves.length}</Text></Text>
        </Box>
      </Box>
      <Newline />

      {/* Watering Configuration */}
      <Text color="cyan" bold>💧 Watering</Text>
      <Box marginLeft={2}>
        <Box flexDirection="column">
          <Text>Enabled: <Text color={config.watering.enabled ? "green" : "yellow"}>{config.watering.enabled ? 'Yes' : 'No'}</Text></Text>
          <Text>Timezone: <Text color="white">{config.watering.timezone}</Text></Text>
          <Text>Schedules: <Text color="white">{config.watering.schedules.length}</Text></Text>
        </Box>
      </Box>
      <Newline />

      {/* Safety Configuration */}
      <Text color="cyan" bold>🛡️  Safety</Text>
      <Box marginLeft={2}>
        <Box flexDirection="column">
          <Text>Max Watering Duration: <Text color="white">{config.safety.maxWateringDuration / 1000}s</Text></Text>
          <Text>Min Time Between Watering: <Text color="white">{config.safety.minTimeBetweenWatering / 1000 / 60}min</Text></Text>
          <Text>Moisture Thresholds: <Text color="white">{config.safety.moistureThresholds.dry}% - {config.safety.moistureThresholds.wet}%</Text></Text>
          <Text>Emergency Shutoff: <Text color={config.safety.emergencyShutoff.enabled ? "green" : "red"}>{config.safety.emergencyShutoff.enabled ? 'Enabled' : 'Disabled'}</Text></Text>
        </Box>
      </Box>
      <Newline />

      {/* Telemetry Configuration */}
      <Text color="cyan" bold>📡 Telemetry</Text>
      <Box marginLeft={2}>
        <Box flexDirection="column">
          <Text>Sensor Reading Interval: <Text color="white">{config.telemetry.intervals.sensorReading / 1000}s</Text></Text>
          <Text>Status Upload Interval: <Text color="white">{config.telemetry.intervals.statusUpload / 1000}s</Text></Text>
          <Text>Health Check Interval: <Text color="white">{config.telemetry.intervals.healthCheck / 1000}s</Text></Text>
          <Text>Batch Size: <Text color="white">{config.telemetry.batchSize}</Text></Text>
        </Box>
      </Box>
      <Newline />

      {/* Logging Configuration */}
      <Text color="cyan" bold>📝 Logging</Text>
      <Box marginLeft={2}>
        <Box flexDirection="column">
          <Text>Level: <Text color="white">{config.logging.level}</Text></Text>
          <Text>Console: <Text color={config.logging.console ? "green" : "red"}>{config.logging.console ? 'Enabled' : 'Disabled'}</Text></Text>
          <Text>File: <Text color={config.logging.file ? "green" : "red"}>{config.logging.file ? 'Enabled' : 'Disabled'}</Text></Text>
          {config.logging.file && <Text>File Path: <Text color="gray">{config.logging.filePath}</Text></Text>}
        </Box>
      </Box>
      <Newline />

      <Text color="gray">💡 Use 'overdrip setup' to modify configuration</Text>
    </Box>
  );
};

export default ConfigShowScreen;
