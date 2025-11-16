import {
  deviceConfigExists,
  getDeviceConfigPath,
  loadDeviceConfig,
  type DeviceConfig
} from '@overdrip/core/device-config';
import { Box, Newline, Text } from 'ink';
import React from 'react';

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

      <Text color="gray">💡 Use 'overdrip setup' to modify configuration</Text>
    </Box>
  );
};

export default ConfigShowScreen;
