import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, Newline } from "ink";
import TextInput, { UncontrolledTextInput } from "ink-text-input";
import Spinner from "ink-spinner";
import { oauthSetupDevice, openBrowser, type SetupProgress, type SetupResult } from "../oauth-setup";
import { loadAuthTokens } from "../auth";

type SetupState =
  | "loading_existing"
  | "input_device_name"
  | "confirm_existing_name"
  | "input_new_name"
  | "setting_up"
  | "complete"
  | "error";

interface SetupScreenState {
  state: SetupState;
  deviceName: string;
  existingDeviceName?: string;
  progress?: SetupProgress;
  result?: SetupResult;
  error?: string;
  oauthUrl?: string;
  browserOpened?: boolean;
}

const OAuthSetupScreen: React.FC = () => {
  const [screenState, setScreenState] = useState<SetupScreenState>({
    state: "loading_existing",
    deviceName: "",
  });

  // Load existing device info on mount
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const tokens = await loadAuthTokens();
        if (tokens) {
          // Existing device - ask about name
          setScreenState({
            state: "confirm_existing_name",
            deviceName: tokens.deviceName,
            existingDeviceName: tokens.deviceName,
          });
        } else {
          // New device - ask for name
          setScreenState({
            state: "input_device_name",
            deviceName: "Plant Monitor",
          });
        }
      } catch {
        // Error loading tokens, treat as new device
        setScreenState({
          state: "input_device_name",
          deviceName: "Plant Monitor",
        });
      }
    };

    loadTokens();
  }, []);

  // Handle device name input submission
  const handleDeviceNameSubmit = useCallback((name: string) => {
    if (!name.trim()) {
      return; // Don't submit empty names
    }
    startSetup(name.trim());
  }, []);

  // Handle existing device name confirmation
  const handleExistingNameConfirm = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed === 'n' || trimmed === 'no') {
      // User wants to change name - show input
      setScreenState(prev => ({
        ...prev,
        state: "input_new_name",
        deviceName: prev.existingDeviceName!, // Reset to current name as default
      }));
    } else {
      // User wants to keep existing name (y, yes, or just Enter)
      startSetup(screenState.existingDeviceName!);
    }
  }, [screenState.existingDeviceName]);

  // Handle new device name input (for changing existing device name)
  const handleNewNameSubmit = useCallback((name: string) => {
    const finalName = name.trim() || screenState.existingDeviceName!;
    startSetup(finalName);
  }, [screenState.existingDeviceName]);

  // Start the OAuth setup process
  const startSetup = useCallback((deviceName: string) => {
    setScreenState(prev => ({
      ...prev,
      state: "setting_up",
      deviceName,
      progress: { step: "initializing" },
    }));

    const handleProgress = (progress: SetupProgress) => {
      setScreenState(prev => ({
        ...prev,
        progress,
        oauthUrl: progress.details,
      }));

      // Try to open browser when OAuth URL is available
      if (progress.step === "waiting_for_auth" && progress.details) {
        setScreenState(prev => {
          if (!prev.browserOpened) {
            openBrowser(progress.details!).then((opened) => {
              setScreenState(current => ({
                ...current,
                browserOpened: opened,
              }));
            });
          }
          return prev;
        });
      }
    };

    oauthSetupDevice(deviceName, handleProgress)
      .then((result) => {
        setScreenState(prev => ({
          ...prev,
          state: "complete",
          result,
        }));
      })
      .catch((error) => {
        setScreenState(prev => ({
          ...prev,
          state: "error",
          error: error.message,
        }));
      });
  }, []);

  // Render loading state
  if (screenState.state === "loading_existing") {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Checking for existing device...</Text>
      </Box>
    );
  }

  // Render device name input for new devices
  if (screenState.state === "input_device_name") {
    return (
      <Box flexDirection="column">
        <Text bold>Device Setup</Text>
        <Newline />
        <Text>Enter a name for your device (default: Plant Monitor):</Text>
        <Newline />
        <TextInput
          value={screenState.deviceName}
          onChange={(value) =>
            setScreenState(prev => ({ ...prev, deviceName: value }))
          }
          onSubmit={handleDeviceNameSubmit}
          placeholder="Plant Monitor"
        />
        <Newline />
        <Text dimColor>Press Enter to continue</Text>
      </Box>
    );
  }

  // Render existing device name confirmation
  if (screenState.state === "confirm_existing_name") {
    return (
      <Box flexDirection="column">
        <Text bold>Re-authenticating Device</Text>
        <Newline />
        <Text>Current device name: <Text bold color="cyan">{screenState.existingDeviceName}</Text></Text>
        <Box>
          <Text>Keep this name? </Text>
          <UncontrolledTextInput
            onSubmit={handleExistingNameConfirm}
            placeholder="Y/n"
          />
        </Box>
        <Newline />
        <Text dimColor>Press Enter to keep current name, or type 'n' to change it</Text>
      </Box>
    );
  }

  // Render new device name input (for changing existing device name)
  if (screenState.state === "input_new_name") {
    return (
      <Box flexDirection="column">
        <Text bold>Change Device Name</Text>
        <Newline />
        <Text>Enter new name for your device:</Text>
        <Box>
          <UncontrolledTextInput
            initialValue={screenState.deviceName}
            onSubmit={handleNewNameSubmit}
            placeholder={screenState.existingDeviceName}
          />
        </Box>
        <Newline />
        <Text dimColor>Press Enter to confirm (or leave empty to keep current name)</Text>
      </Box>
    );
  }

  // Render setup progress
  if (screenState.state === "setting_up") {
    const { progress, oauthUrl, browserOpened } = screenState;

    return (
      <Box flexDirection="column">
        <Text bold>Setting up device: {screenState.deviceName}</Text>
        <Newline />

        {progress && (
          <Box>
            <Spinner type="dots" />
            <Text> {getProgressMessage(progress.step)}</Text>
          </Box>
        )}

        {progress?.step === "waiting_for_auth" && oauthUrl && (
          <Box flexDirection="column" marginTop={1}>
            <Newline />
            {browserOpened ? (
              <Text color="green">✓ Opened browser for authentication</Text>
            ) : (
              <>
                <Text color="yellow">⚠ Could not open browser automatically</Text>
                <Text>Please open this URL in your browser:</Text>
              </>
            )}
            <Newline />
            <Text color="cyan">{oauthUrl}</Text>
            <Newline />
            <Text dimColor>Waiting for authentication to complete...</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Render completion
  if (screenState.state === "complete" && screenState.result) {
    const { result } = screenState;

    return (
      <Box flexDirection="column">
        <Text color="green" bold>✓ Device Setup Complete!</Text>
        <Newline />
        <Text>Device: <Text bold>{result.deviceName}</Text></Text>
        <Text>ID: <Text dimColor>{result.deviceId}</Text></Text>
        <Newline />
        {result.isReauth ? (
          <Text>Your device has been re-authenticated and is ready to use.</Text>
        ) : (
          <Text>Your device has been registered and is ready to use.</Text>
        )}
        <Newline />
        <Text dimColor>You can now run: <Text bold>overdrip start</Text></Text>
      </Box>
    );
  }

  // Render error
  if (screenState.state === "error") {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>✗ Setup Failed</Text>
        <Newline />
        <Text color="red">{screenState.error}</Text>
        <Newline />
        <Text dimColor>Please try running the setup command again.</Text>
      </Box>
    );
  }

  return <Text>Unknown state</Text>;
};

function getProgressMessage(step: string): string {
  switch (step) {
    case "initializing":
      return "Initializing setup...";
    case "starting_oauth_server":
      return "Starting local server...";
    case "waiting_for_auth":
      return "Waiting for Google authentication...";
    case "exchanging_tokens":
      return "Exchanging authorization code...";
    case "authenticating_firebase":
      return "Authenticating with Firebase...";
    case "setting_up_device":
      return "Setting up device...";
    case "storing_credentials":
      return "Storing credentials...";
    case "complete":
      return "Setup complete!";
    default:
      return step;
  }
}

export default OAuthSetupScreen;
