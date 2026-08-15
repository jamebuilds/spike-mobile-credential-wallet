import { p256 } from "@noble/curves/nist.js";
import type { Jwk } from "@openid4vc/oauth2";
import * as Crypto from "expo-crypto";

const B64U_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64U_ALPHABET[b0 >> 2];
    out += B64U_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 !== undefined) out += B64U_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 !== undefined) out += B64U_ALPHABET[b2 & 0x3f];
  }
  return out;
}

export function base64UrlToBytes(input: string): Uint8Array {
  const clean = input.replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = B64U_ALPHABET.indexOf(char.replace("+", "-").replace("/", "_"));
    if (value === -1) throw new Error(`Invalid base64url character: ${char}`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

export function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

export function base64UrlToJson(input: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(input)));
}

export interface HolderKey {
  privateKey: Uint8Array;
  publicJwk: Jwk;
}

/**
 * Ephemeral P-256 holder key: lives only in JS memory for this app session.
 * A production wallet would generate this in the Secure Enclave / Android
 * Keystore (e.g. @animo-id/expo-secure-environment) instead.
 */
export function generateHolderKey(): HolderKey {
  // noble's own randomSecretKey() needs a global crypto.getRandomValues, which
  // Hermes doesn't provide — so we source randomness from expo-crypto instead.
  let privateKey: Uint8Array;
  do {
    privateKey = Crypto.getRandomValues(new Uint8Array(32));
  } while (!p256.utils.isValidSecretKey(privateKey));
  const publicKey = p256.getPublicKey(privateKey, false);
  return {
    privateKey,
    publicJwk: {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64Url(publicKey.slice(1, 33)),
      y: bytesToBase64Url(publicKey.slice(33, 65)),
    },
  };
}

export function signJwtES256(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKey: Uint8Array,
): string {
  const signingInput = `${bytesToBase64Url(utf8ToBytes(JSON.stringify(header)))}.${bytesToBase64Url(
    utf8ToBytes(JSON.stringify(payload)),
  )}`;
  // ES256 = ECDSA over P-256 with SHA-256; compact (r || s) signature
  const signature = p256.sign(utf8ToBytes(signingInput), privateKey, { prehash: true });
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}
