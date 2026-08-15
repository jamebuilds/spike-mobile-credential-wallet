import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import {
  clientAuthenticationAnonymous,
  HashAlgorithm,
  type CallbackContext,
} from "@openid4vc/oauth2";
import * as Crypto from "expo-crypto";
import { generateHolderKey, signJwtES256, type HolderKey } from "./crypto";

/**
 * Ephemeral holder key for this app session (regenerated on every launch).
 */
export const holderKey: HolderKey = generateHolderKey();

/**
 * The callbacks @openid4vc/openid4vci needs to run in this environment.
 * The client requires CallbackContext minus verifyJwt/encryptJwe.
 */
export const callbacks: Omit<CallbackContext, "verifyJwt" | "encryptJwe"> = {
  hash: (data, alg) => {
    switch (alg) {
      case HashAlgorithm.Sha256:
        return sha256(data);
      case HashAlgorithm.Sha384:
        return sha384(data);
      case HashAlgorithm.Sha512:
        return sha512(data);
      default:
        throw new Error(`Unsupported hash algorithm: ${alg}`);
    }
  },
  generateRandom: (byteLength) => Crypto.getRandomValues(new Uint8Array(byteLength)),
  signJwt: (signer, { header, payload }) => {
    if (signer.method !== "jwk" || signer.alg !== "ES256") {
      throw new Error(`Only ES256 jwk signing is supported, got ${signer.method}/${signer.alg}`);
    }
    return {
      jwt: signJwtES256(header, payload, holderKey.privateKey),
      signerJwk: holderKey.publicJwk,
    };
  },
  decryptJwe: () => {
    throw new Error("JWE decryption is not supported by this wallet");
  },
  clientAuthentication: clientAuthenticationAnonymous(),
};
