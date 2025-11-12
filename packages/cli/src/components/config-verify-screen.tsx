import {
  deviceConfigExists,
  getDeviceConfigPath,
  loadDeviceConfig
} from '@overdrip/core/device-config';
import { Box, Newline, Text } from 'ink';
import { useEffect, useState } from 'react';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

const ConfigVerifyScreen = () => {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyConfig = async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        info: []
      };

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

      try {
        const { lastModified } = await loadDeviceConfig();
        validationResult.info.push(
          "✓ Configuration file is valid JSON",
          `✓ Last Modified: ${lastModified}`
        );
      } catch (err) {
        validationResult.isValid = false;
        validationResult.errors.push(`Configuration validation failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setResult(validationResult);
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
