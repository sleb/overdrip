import os from "node:os";
import path from "node:path";
import { write } from "bun";
import { signInWithCustomToken } from "firebase/auth/web-extension";
import z from "zod";
import { auth } from "@overdrip/core/firebase";

export const logIn = async (token: string): Promise<string> => {
  const { user } = await signInWithCustomToken(auth, token);
  return user.refreshToken;
};

const AuthTokensSchema = z.object({
  deviceId: z.string().nonempty(),
  refreshToken: z.string().nonempty(),
  registrationCode: z.string().nonempty(),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const storeAuthTokens = async (tokens: AuthTokens): Promise<void> => {
  const authPath = path.join(os.homedir(), ".overdrip", "auth.json");
  await write(authPath, JSON.stringify(tokens), {
    createPath: true,
    mode: 0o600,
  });
};
