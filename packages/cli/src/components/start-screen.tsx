import { OverdripDeviceClient } from "@overdrip/core/client";
import { loadDeviceConfig } from "@overdrip/core/device-config";
import { Box, Newline, Text } from "ink";
import Spinner from "ink-spinner";
import React, { useEffect, useState } from "react";

type StartState = "loading" | "authenticating" | "running" | "error";

interface StartScreenState {
  state: StartState;
  deviceName?: string;
  deviceId?: string;
  error?: string;
}

const StartScreen: React.FC = () => {
  const [screenState, setScreenState] = useState<StartScreenState>({
    state: "loading",
  });

  useEffect(() => {
    startDevice();
  }, []);

  const startDevice = async () => {
    try {
      // Check if device is set up
      setScreenState({ state: "loading" });

      const deviceInfo = (await loadDeviceConfig());
      if (!deviceInfo) {
        throw new Error(
          "No device credentials found. Please run 'overdrip setup' to register your device."
        );
      }

      setScreenState({
        state: "authenticating",
        deviceName: deviceInfo.deviceName,
        deviceId: deviceInfo.deviceId,
      });

      // Authenticate with Firebase using auth code
      const deviceClient = new OverdripDeviceClient(deviceInfo);
      await deviceClient.authenticate();

      setScreenState(prev => ({
        ...prev,
        state: "running",
      }));

      // TODO: Start actual device operations (sensor reading, data push, etc.)
      // For now, just show running status

    } catch (error) {
      setScreenState(prev => ({
        ...prev,
        state: "error",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  if (screenState.state === "loading") {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading device credentials...</Text>
      </Box>
    );
  }

  if (screenState.state === "authenticating") {
    return (
      <Box flexDirection="column">
        <Text bold>Starting Device: {screenState.deviceName}</Text>
        <Text dimColor>ID: {screenState.deviceId}</Text>
        <Newline />
        <Box>
          <Spinner type="dots" />
          <Text> Authenticating with Firebase...</Text>
        </Box>
      </Box>
    );
  }

  if (screenState.state === "running") {
    return (
      <Box flexDirection="column">
        <Text color="green" bold>✓ Device Started Successfully</Text>
        <Newline />
        <Text>Device: <Text bold>{screenState.deviceName}</Text></Text>
        <Text dimColor>ID: {screenState.deviceId}</Text>
        <Newline />
        <Box>
          <Spinner type="dots" />
          <Text color="green"> Running... (Press Ctrl+C to stop)</Text>
        </Box>
        <Newline />
        <Text dimColor>
          Device operations will be implemented here:
          {"\n"}• Sensor data collection
          {"\n"}• Configuration updates
          {"\n"}• Heartbeat/presence
        </Text>
      </Box>
    );
  }

  if (screenState.state === "error") {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>✗ Failed to Start Device</Text>
        <Newline />
        <Text color="red">{screenState.error}</Text>
        <Newline />
        {screenState.error?.includes("No device credentials") ? (
          <Text dimColor>Run: <Text bold>overdrip setup</Text></Text>
        ) : (
          <Text dimColor>Please check your connection and try again.</Text>
        )}
      </Box>
    );
  }

  return <Text>Unknown state</Text>;
};

export default StartScreen;
