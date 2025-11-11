import { describe, test, expect } from "bun:test";
import {
  generatePKCEChallenge,
  buildOAuthURL,
  parseIdToken,
  type PKCEChallenge
} from "../oauth";
import crypto from "node:crypto";

describe("OAuth Utilities", () => {
  describe("PKCE Generation", () => {
    test("should generate valid PKCE challenge", () => {
      const challenge = generatePKCEChallenge();

      // Verify structure
      expect(challenge).toHaveProperty('codeVerifier');
      expect(challenge).toHaveProperty('codeChallenge');
      expect(challenge).toHaveProperty('state');

      // Verify code verifier format (base64url, ~128 chars from 96 bytes)
      expect(challenge.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge.codeVerifier.length).toBeGreaterThan(120);
      expect(challenge.codeVerifier.length).toBeLessThan(140);

      // Verify code challenge format (base64url, 43 chars from 32 bytes SHA256)
      expect(challenge.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge.codeChallenge.length).toBe(43);

      // Verify state format (base64url, ~43 chars from 32 bytes)
      expect(challenge.state).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge.state.length).toBe(43);
    });



    test("should create valid SHA256 code challenge", () => {
      const challenge = generatePKCEChallenge();

      // Verify that the challenge is different from the verifier
      expect(challenge.codeChallenge).not.toBe(challenge.codeVerifier);

      // Verify challenge is base64url format (43 chars from SHA256)
      expect(challenge.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge.codeChallenge.length).toBe(43);

      // Test that challenge is deterministic - same verifier should produce same challenge
      const verifier = challenge.codeVerifier;
      const hash = crypto.createHash('sha256').update(verifier, 'utf8').digest();
      const expectedChallenge = hash.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      expect(challenge.codeChallenge).toBe(expectedChallenge);
    });


  });

  describe("OAuth URL Building", () => {
    const mockChallenge: PKCEChallenge = {
      codeVerifier: "mock-verifier",
      codeChallenge: "mock-challenge",
      state: "mock-state"
    };

    test("should build valid Google OAuth URL", () => {
      const url = buildOAuthURL(
        "test-client-id",
        "http://localhost:8080/callback",
        mockChallenge
      );

      expect(url).toStartWith("https://accounts.google.com/o/oauth2/v2/auth?");

      const urlObj = new URL(url);
      expect(urlObj.hostname).toBe("accounts.google.com");
      expect(urlObj.pathname).toBe("/o/oauth2/v2/auth");
    });

    test("should include all required OAuth parameters", () => {
      const clientId = "test-client-id";
      const redirectUri = "http://localhost:8080/callback";

      const url = buildOAuthURL(clientId, redirectUri, mockChallenge);
      const params = new URL(url).searchParams;

      // Required OAuth 2.0 + PKCE parameters
      expect(params.get('client_id')).toBe(clientId);
      expect(params.get('redirect_uri')).toBe(redirectUri);
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('openid email profile');
      expect(params.get('state')).toBe(mockChallenge.state);
      expect(params.get('code_challenge')).toBe(mockChallenge.codeChallenge);
      expect(params.get('code_challenge_method')).toBe('S256');
    });

    test("should properly encode redirect URI", () => {
      const redirectUri = "http://localhost:8080/callback?param=value&other=test";

      const url = buildOAuthURL("client", redirectUri, mockChallenge);
      const params = new URL(url).searchParams;

      expect(params.get('redirect_uri')).toBe(redirectUri);
    });

    test("should handle special characters in client ID", () => {
      const clientId = "client-id_with.special+chars";

      const url = buildOAuthURL(clientId, "http://localhost/", mockChallenge);
      const params = new URL(url).searchParams;

      expect(params.get('client_id')).toBe(clientId);
    });

    test("should maintain parameter order for consistency", () => {
      const url = buildOAuthURL("client", "http://localhost/", mockChallenge);
      const paramString = new URL(url).search;

      // Parameters should be in a predictable order
      expect(paramString).toMatch(/client_id=.*redirect_uri=.*response_type=/);
    });
  });

  describe("ID Token Parsing", () => {
    // Valid JWT structure: header.payload.signature
    const createMockJWT = (payload: any) => {
      const header = { alg: "RS256", typ: "JWT" };
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
      const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
      const mockSignature = "mock-signature";

      return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
    };

    test("should parse valid JWT ID token", () => {
      const payload = {
        sub: "user123",
        email: "test@example.com",
        name: "Test User",
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const token = createMockJWT(payload);
      const parsed = parseIdToken(token);

      expect(parsed).toEqual(payload);
      expect(parsed.sub).toBe("user123");
      expect(parsed.email).toBe("test@example.com");
    });

    test("should reject malformed tokens", () => {
      // Not enough parts
      expect(() => parseIdToken("invalid")).toThrow("Invalid ID token format");
      expect(() => parseIdToken("one.two")).toThrow("Invalid ID token format");
      expect(() => parseIdToken("one.two.three.four")).toThrow("Invalid ID token format");
    });

    test("should reject tokens with empty payload", () => {
      expect(() => parseIdToken("header..signature")).toThrow("Invalid ID token payload");
    });

    test("should handle base64 padding correctly", () => {
      // Test various padding scenarios
      const payloads = [
        { test: "a" },      // Short payload
        { test: "ab" },     // Medium payload
        { test: "abc" },    // Longer payload
        { test: "abcd" },   // Different length
      ];

      payloads.forEach(payload => {
        const token = createMockJWT(payload);
        const parsed = parseIdToken(token);
        expect(parsed).toEqual(payload);
      });
    });

    test("should parse real-world JWT structure", () => {
      const realisticPayload = {
        iss: "https://accounts.google.com",
        aud: "client-id.apps.googleusercontent.com",
        sub: "1234567890",
        email: "user@example.com",
        email_verified: true,
        name: "Test User",
        picture: "https://example.com/photo.jpg",
        given_name: "Test",
        family_name: "User",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const token = createMockJWT(realisticPayload);
      const parsed = parseIdToken(token);

      expect(parsed.iss).toBe("https://accounts.google.com");
      expect(parsed.email_verified).toBe(true);
      expect(typeof parsed.iat).toBe("number");
      expect(typeof parsed.exp).toBe("number");
    });

    test("should handle invalid JSON in payload", () => {
      // Create token with malformed JSON payload
      const header = btoa(JSON.stringify({ alg: "RS256" }));
      const invalidPayload = btoa("invalid-json{");
      const signature = "signature";

      const token = `${header}.${invalidPayload}.${signature}`;

      expect(() => parseIdToken(token)).toThrow();
    });

    test("should preserve all payload fields", () => {
      const complexPayload = {
        string: "value",
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, 2, 3],
        object: { nested: "value" }
      };

      const token = createMockJWT(complexPayload);
      const parsed = parseIdToken(token);

      expect(parsed).toEqual(complexPayload);
      expect(Array.isArray(parsed.array)).toBe(true);
      expect(typeof parsed.object).toBe("object");
    });
  });

  describe("Base64URL Encoding", () => {
    // Test the internal base64URL encoding indirectly through PKCE
    test("should produce valid base64url format", () => {
      const challenge = generatePKCEChallenge();

      // Base64url should not contain +, /, or = characters
      expect(challenge.codeVerifier).not.toMatch(/[\+\/=]/);
      expect(challenge.codeChallenge).not.toMatch(/[\+\/=]/);
      expect(challenge.state).not.toMatch(/[\+\/=]/);

      // Should only contain base64url alphabet
      expect(challenge.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge.state).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test("should be reversible for verifier validation", () => {
      const challenge = generatePKCEChallenge();

      // Should be able to decode the verifier back to original bytes
      expect(() => {
        const decoded = Buffer.from(
          challenge.codeVerifier
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(challenge.codeVerifier.length + (4 - challenge.codeVerifier.length % 4) % 4, '='),
          'base64'
        );

        // Should decode to 96 bytes as specified in generatePKCEChallenge
        expect(decoded.length).toBe(96);
      }).not.toThrow();
    });
  });

  describe("Security Properties", () => {


    test("should meet PKCE security requirements", () => {
      const challenge = generatePKCEChallenge();

      // PKCE code verifier should be 43-128 characters (RFC 7636 requirement)
      expect(challenge.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(challenge.codeVerifier.length).toBeLessThanOrEqual(128);

      // Should use S256 method (SHA256 hash produces 43 base64url chars)
      expect(challenge.codeChallenge.length).toBe(43);

      // State should meet OAuth security requirements (43 base64url chars from 32 bytes)
      expect(challenge.state.length).toBe(43);
      expect(challenge.state).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
