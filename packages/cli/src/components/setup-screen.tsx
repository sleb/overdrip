import { Box, Newline, Text } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import { setupDevice } from "../setup.tsx";

const SetupScreen = () => {
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [step, setStep] = useState<string>("");

  useEffect(() => {
    setupDevice(setStep)
      .then((registrationCode) => {
        setRegistrationCode(registrationCode);
      })
      .catch((error) => {
        console.error(error);
        setStep("error");
      })
      .finally(() => setStep("done"));
  }, []);

  if (step !== "done") {
    return (
      <Box height={4}>
        <Spinner type="dots" />
        <Text>{` ${step}...`}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text>
        <Text bold>Device Setup Complete!</Text>
        <Newline />
        1. Visit https://overdrip-ed767.web.app/register to register your
        device.
        <Newline />
        2. Enter registration code {registrationCode}
        <Newline />
      </Text>
    </Box>
  );
};

export default SetupScreen;
