import { httpsCallable } from "firebase/functions";
import { functions } from "@overdrip/core/firebase";
import type {
  RegisterDeviceRequest,
  RegisterDeviceResponse,
} from "@overdrip/core/schemas";

export const registerDevice = async (
  request: RegisterDeviceRequest,
): Promise<RegisterDeviceResponse> => {
  const registerDeviceCallable = httpsCallable<
    RegisterDeviceRequest,
    RegisterDeviceResponse
  >(functions, "registerDevice");

  try {
    const res = await registerDeviceCallable(request);
    return res.data;
  } catch (error) {
    throw new Error(`Failed to register device: ${error}`);
  }
};
