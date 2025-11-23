/**
 * Ngrok Service
 *
 * Manages ngrok tunnels for OAuth callback URL exposure.
 * Used during development to create HTTPS tunnels for localhost servers.
 *
 * Based on specs/001-slack-workflow-sharing/slack-api-contracts.md
 */

import ngrok from '@ngrok/ngrok';

/**
 * Ngrok tunnel result
 */
export interface NgrokTunnel {
  /** Public HTTPS URL */
  publicUrl: string;
  /** Local port being tunneled */
  localPort: number;
}

/**
 * Ngrok service for creating HTTPS tunnels
 */
export class NgrokService {
  private listener: ngrok.Listener | null = null;

  constructor(private readonly authtoken?: string) {}

  /**
   * Creates an HTTPS tunnel to a local port
   *
   * @param localPort - Local port to tunnel
   * @param timeoutMs - Timeout in milliseconds (default: 30000)
   * @returns Promise resolving to tunnel information
   */
  async createTunnel(localPort: number, timeoutMs = 30000): Promise<NgrokTunnel> {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Ngrok tunnel creation timeout after 30 seconds'));
        }, timeoutMs);
      });

      // Create ngrok tunnel with timeout
      const tunnelPromise = ngrok.forward({
        addr: localPort,
        authtoken: this.authtoken, // Use authtoken from constructor
      });

      this.listener = await Promise.race([tunnelPromise, timeoutPromise]);

      const publicUrl = this.listener.url();

      if (!publicUrl) {
        throw new Error('Failed to get ngrok tunnel URL');
      }

      return {
        publicUrl,
        localPort,
      };
    } catch (error) {
      // Clean up on error
      await this.closeTunnel();

      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error(
            'Ngrok tunnel creation timed out. Please check your network connection and try again.'
          );
        }
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          throw new Error(
            'Ngrok is not installed. Please install ngrok via npm: npm install --save-dev @ngrok/ngrok'
          );
        }
        throw new Error(`Failed to create ngrok tunnel: ${error.message}`);
      }

      throw new Error('Failed to create ngrok tunnel: Unknown error');
    }
  }

  /**
   * Closes the active tunnel
   */
  async closeTunnel(): Promise<void> {
    if (this.listener) {
      try {
        await this.listener.close();
      } catch (error) {
        console.error('[NgrokService] Error closing tunnel:', error);
      } finally {
        this.listener = null;
      }
    }
  }

  /**
   * Gets the current tunnel URL
   *
   * @returns Public URL or null if no tunnel is active
   */
  getPublicUrl(): string | null {
    return this.listener?.url() || null;
  }

  /**
   * Checks if a tunnel is currently active
   *
   * @returns True if tunnel is active
   */
  isActive(): boolean {
    return this.listener !== null;
  }
}
