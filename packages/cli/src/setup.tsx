import { FUNCTIONS_URL } from "@overdrip/core/config";
import {
  CreateDeviceErrorSchema,
  type CreateDeviceResponse,
  CreateDeviceResponseSchema,
} from "@overdrip/core/schemas";
import { app } from "./app";
import { logIn, storeAuthTokens } from "./auth";
import type { CommandWithHandler } from "clerc";

export const setupDevice = async (
  setStep: (step: string) => void,
): Promise<string> => {
  setStep("creating device");
  const { customToken, deviceId, registrationCode } = await createDevice();

  setStep("logging in");
  const refreshToken = await logIn(customToken);

  setStep("storing tokens");
  await storeAuthTokens({ refreshToken, deviceId, registrationCode });

  return registrationCode;
};

const createDevice = async (): Promise<CreateDeviceResponse> => {
  const res = await fetch(`${FUNCTIONS_URL}/createDevice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const errorData = CreateDeviceErrorSchema.parse(json);
    throw new Error(`Failed to create device: ${errorData.error}`);
  }

  return CreateDeviceResponseSchema.parse(json);
};

export const setupCommand: CommandWithHandler = {
  name: "setup",
  description: "Setup a new device",
  handler() {
    app("setup");
  },
};
