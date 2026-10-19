import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Resolves a 32-byte (256-bit) encryption key for AES-256-GCM.
 * Prioritizes GOOGLE_TOKEN_ENCRYPTION_KEY if provided;
 * otherwise deterministically derives a key from JWT_SECRET so that
 * local development and tests run smoothly without crashing.
 */
export function getEncryptionKey(): Buffer {
  if (env.GOOGLE_TOKEN_ENCRYPTION_KEY && env.GOOGLE_TOKEN_ENCRYPTION_KEY.trim().length > 0) {
    const keyStr = env.GOOGLE_TOKEN_ENCRYPTION_KEY.trim();
    if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
      return Buffer.from(keyStr, "hex");
    }
    return crypto.createHash("sha256").update(keyStr).digest();
  }

  return crypto
    .createHash("sha256")
    .update((env.JWT_SECRET || "default_jwt_secret_min_32_chars") + ":earlyai-google-token-key")
    .digest();
}

export interface EncryptedPayload {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypts a plaintext string (e.g. Google OAuth refresh token) using AES-256-GCM.
 * Generates a unique 96-bit (12-byte) initialization vector per encryption.
 */
export function encryptToken(plaintext: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload and verifies its authentication tag.
 * Throws an error if the ciphertext, IV, or authTag has been tampered with.
 */
export function decryptToken(encryptedHex: string, ivHex: string, authTagHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
