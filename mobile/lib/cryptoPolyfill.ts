/**
 * Supabase PKCE needs WebCrypto (crypto.subtle.digest SHA-256).
 * Hermes / React Native do not provide it — without this, OAuth falls back to
 * "plain" challenge and Google login fails or never completes.
 *
 * Import this file first (before @supabase/supabase-js).
 */
import "react-native-get-random-values";
import * as ExpoCrypto from "expo-crypto";

type SubtleDigest = (
  algorithm: AlgorithmIdentifier,
  data: BufferSource,
) => Promise<ArrayBuffer>;

function toUint8Array(data: BufferSource): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function mapAlgo(
  algorithm: AlgorithmIdentifier,
): ExpoCrypto.CryptoDigestAlgorithm {
  const name =
    typeof algorithm === "string"
      ? algorithm
      : (algorithm as { name?: string }).name || "";
  const n = name.toUpperCase().replace(/-/g, "");
  if (n === "SHA256" || name === "SHA-256") {
    return ExpoCrypto.CryptoDigestAlgorithm.SHA256;
  }
  if (n === "SHA384" || name === "SHA-384") {
    return ExpoCrypto.CryptoDigestAlgorithm.SHA384;
  }
  if (n === "SHA512" || name === "SHA-512") {
    return ExpoCrypto.CryptoDigestAlgorithm.SHA512;
  }
  if (n === "SHA1" || name === "SHA-1") {
    return ExpoCrypto.CryptoDigestAlgorithm.SHA1;
  }
  throw new Error(`Unsupported digest algorithm: ${name}`);
}

const g = globalThis as typeof globalThis & {
  crypto?: {
    getRandomValues?: (array: ArrayBufferView) => ArrayBufferView;
    subtle?: { digest: SubtleDigest };
  };
};

if (!g.crypto) {
  g.crypto = {} as typeof g.crypto;
}

const existingSubtle = g.crypto?.subtle;
const needsPolyfill =
  !existingSubtle || typeof existingSubtle.digest !== "function";

if (needsPolyfill && g.crypto) {
  g.crypto.subtle = {
    ...existingSubtle,
    digest: async (algorithm, data) => {
      const algo = mapAlgo(algorithm);
      const bytes = toUint8Array(data);
      // Native byte digest — returns ArrayBuffer (WebCrypto shape)
      return ExpoCrypto.digest(algo, bytes as unknown as BufferSource);
    },
  } as SubtleCrypto;
}

export {};
