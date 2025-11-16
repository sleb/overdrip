import crypto from "node:crypto";

/**
 * OAuth utilities for Google authentication with PKCE
 */

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Generate PKCE code verifier and challenge
 */
export const generatePKCEChallenge = (): PKCEChallenge => {
  // Generate code verifier: 128 character random string
  const codeVerifier = base64URLEncode(crypto.randomBytes(96));

  // Generate code challenge: SHA256 hash of verifier
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64URLEncode(hash);

  // Generate state parameter for CSRF protection
  const state = base64URLEncode(crypto.randomBytes(32));

  return {
    codeVerifier,
    codeChallenge,
    state
  };
};

/**
 * Base64URL encode (RFC 4648 section 5)
 */
const base64URLEncode = (buffer: Buffer): string => {
  return buffer.toString("base64url");
};

/**
 * Build Google OAuth authorization URL
 */
export const buildOAuthURL = (
  clientId: string,
  redirectUri: string,
  challenge: PKCEChallenge
): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: challenge.state,
    code_challenge: challenge.codeChallenge,
    code_challenge_method: 'S256'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (
  clientId: string,
  redirectUri: string,
  code: string,
  codeVerifier: string,
  clientSecret?: string
): Promise<OAuthTokenResponse> => {
  const params: Record<string, string> = {
    client_id: clientId,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };

  // Add client secret if provided (required for Web Application OAuth clients)
  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json() as any;
    throw new Error(`Token exchange failed: ${errorData.error || response.statusText}`);
  }

  return (await response.json()) as OAuthTokenResponse;
};

/**
 * Parse ID token payload (without verification - Firebase will verify)
 */
export const parseIdToken = (idToken: string): any => {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format');
  }

  const payload = parts[1];
  if (!payload) {
    throw new Error('Invalid ID token payload');
  }

  // Add padding if needed for base64 decoding
  const paddedPayload = payload + '=='.substring(0, (4 - payload.length % 4) % 4);
  const decoded = atob(paddedPayload);
  return JSON.parse(decoded);
};
