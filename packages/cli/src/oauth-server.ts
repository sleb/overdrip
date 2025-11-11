import type { Server } from "bun";

/**
 * Local OAuth server for handling Google OAuth redirects
 */

export interface OAuthCallbackResult {
  code: string;
  state: string;
}

export interface OAuthServerConfig {
  port: number;
  expectedState: string;
  timeout?: number; // milliseconds, default 5 minutes
}

export class OAuthServer {
  private server: Server<any> | null = null;
  private promise: Promise<OAuthCallbackResult> | null = null;
  private resolve: ((result: OAuthCallbackResult) => void) | null = null;
  private reject: ((error: Error) => void) | null = null;
  private timeoutId: Timer | null = null;

  /**
   * Start the OAuth server and return promise that resolves with callback result
   */
  async start(config: OAuthServerConfig): Promise<OAuthCallbackResult> {
    if (this.server) {
      throw new Error('OAuth server already running');
    }

    const { port, expectedState, timeout = 5 * 60 * 1000 } = config;

    // Create promise that will be resolved by the callback
    this.promise = new Promise<OAuthCallbackResult>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    // Set timeout
    this.timeoutId = setTimeout(() => {
      this.stop();
      this.reject?.(new Error('OAuth flow timed out'));
    }, timeout);

    try {
      // Start server
      this.server = Bun.serve({
        port,
        hostname: '127.0.0.1', // Localhost only for security
        fetch: (req) => this.handleRequest(req, expectedState),
      });

      return this.promise;
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start OAuth server on port ${port}: ${error}`);
    }
  }

  /**
   * Stop the server and cleanup
   */
  stop(): void {
    this.cleanup();
  }

  /**
   * Get the redirect URI for this server
   */
  static getRedirectUri(port: number): string {
    return `http://localhost:${port}/callback`;
  }

  /**
   * Find an available port starting from the preferred port
   */
  static async findAvailablePort(startPort: number = 8080): Promise<number> {
    for (let port = startPort; port < startPort + 10; port++) {
      try {
        // Try to create a temporary server to test port availability
        const testServer = Bun.serve({
          port,
          hostname: '127.0.0.1',
          fetch: () => new Response('test'),
        });
        testServer.stop();
        return port;
      } catch (error) {
        // Port is in use, try next one
        continue;
      }
    }
    throw new Error(`No available ports found in range ${startPort}-${startPort + 9}`);
  }

  private async handleRequest(req: Request, expectedState: string): Promise<Response> {
    const url = new URL(req.url);

    // Handle OAuth callback
    if (url.pathname === '/callback') {
      return this.handleCallback(url, expectedState);
    }

    // Handle other requests (return 404)
    return new Response('Not Found', { status: 404 });
  }

  private handleCallback(url: URL, expectedState: string): Response {
    try {
      // Extract parameters from callback URL
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Handle OAuth errors
      if (error) {
        const errorDescription = url.searchParams.get('error_description') || error;
        this.reject?.(new Error(`OAuth error: ${errorDescription}`));
        return this.createErrorResponse(`Authentication failed: ${errorDescription}`);
      }

      // Validate required parameters
      if (!code || !state) {
        this.reject?.(new Error('Missing required OAuth parameters'));
        return this.createErrorResponse('Invalid callback parameters');
      }

      // Validate state parameter (CSRF protection)
      if (state !== expectedState) {
        this.reject?.(new Error('State parameter mismatch - possible CSRF attack'));
        return this.createErrorResponse('Security validation failed');
      }

      // Success - resolve the promise
      this.resolve?.({ code, state });

      // Return success page
      return this.createSuccessResponse();

    } catch (error) {
      this.reject?.(new Error(`Callback handling failed: ${error}`));
      return this.createErrorResponse('Internal server error');
    } finally {
      // Cleanup after handling callback
      setTimeout(() => this.cleanup(), 1000); // Give browser time to render response
    }
  }

  private createSuccessResponse(): Response {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Overdrip - Authentication Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 40px;
            text-align: center;
            background: #f5f5f5;
        }
        .card {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .success { color: #16a34a; font-size: 48px; margin-bottom: 20px; }
        h1 { color: #1f2937; margin-bottom: 10px; }
        p { color: #6b7280; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="card">
        <div class="success">✓</div>
        <h1>Authentication Successful!</h1>
        <p>Your device has been authenticated with Google.</p>
        <p>You can close this window and return to your terminal.</p>
    </div>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  private createErrorResponse(message: string): Response {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Overdrip - Authentication Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 40px;
            text-align: center;
            background: #f5f5f5;
        }
        .card {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
        h1 { color: #1f2937; margin-bottom: 10px; }
        p { color: #6b7280; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="card">
        <div class="error">✗</div>
        <h1>Authentication Failed</h1>
        <p>${message}</p>
        <p>Please close this window and try again in your terminal.</p>
    </div>
</body>
</html>`;

    return new Response(html, {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.server) {
      this.server.stop();
      this.server = null;
    }

    // Clear promise handlers
    this.resolve = null;
    this.reject = null;
    this.promise = null;
  }
}
