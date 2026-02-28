/**
 * Secret Store
 *
 * Encrypted file-based token storage for web mode.
 * Replaces vscode.ExtensionContext.secrets for standalone operation.
 *
 * Stores encrypted secrets in ~/.cc-wf-studio/secrets.json
 * Uses Node.js crypto for AES-256-GCM encryption with a machine-derived key.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const STORE_DIR = path.join(os.homedir(), '.cc-wf-studio');
const STORE_FILE = path.join(STORE_DIR, 'secrets.json');
const ALGORITHM = 'aes-256-gcm';

export class SecretStore {
  private cache: Map<string, string> | null = null;

  /**
   * Get the encryption key derived from machine-specific data
   */
  private getKey(): Buffer {
    // Derive key from hostname + username for machine-specific encryption
    const material = `cc-wf-studio-${os.hostname()}-${os.userInfo().username}`;
    return crypto.createHash('sha256').update(material).digest();
  }

  private encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  private decrypt(ciphertext: string): string {
    const [ivHex, tagHex, encrypted] = ciphertext.split(':');
    const key = this.getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async loadStore(): Promise<Map<string, string>> {
    if (this.cache) return this.cache;

    try {
      const content = await fs.readFile(STORE_FILE, 'utf-8');
      const data = JSON.parse(content);
      this.cache = new Map(Object.entries(data));
    } catch {
      this.cache = new Map();
    }

    return this.cache;
  }

  private async saveStore(): Promise<void> {
    if (!this.cache) return;
    await fs.mkdir(STORE_DIR, { recursive: true });
    const data = Object.fromEntries(this.cache);
    await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  }

  async get(key: string): Promise<string | null> {
    const store = await this.loadStore();
    const encrypted = store.get(key);
    if (!encrypted) return null;

    try {
      return this.decrypt(encrypted);
    } catch {
      // Decryption failed (key changed, corrupted data)
      store.delete(key);
      await this.saveStore();
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const store = await this.loadStore();
    store.set(key, this.encrypt(value));
    await this.saveStore();
  }

  async delete(key: string): Promise<void> {
    const store = await this.loadStore();
    store.delete(key);
    await this.saveStore();
  }

  async has(key: string): Promise<boolean> {
    const store = await this.loadStore();
    return store.has(key);
  }
}
