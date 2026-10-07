/**
 * Resilient key-value storage for Expo Go + native.
 * Always keeps an in-memory copy so auth works even if SecureStore/AsyncStorage fails.
 * Never throws to callers.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const memory = new Map<string, string>();
const CHUNK = 1800;

/** SecureStore only (AsyncStorage is read once for migration); always succeed via memory. */
async function secureGet(key: string): Promise<string | null> {
  try {
    const partsRaw = await SecureStore.getItemAsync(`${key}__parts`);
    if (partsRaw) {
      const n = Number(partsRaw);
      if (!Number.isFinite(n) || n <= 0) return null;
      let out = "";
      for (let i = 0; i < n; i++) {
        const piece = await SecureStore.getItemAsync(`${key}__${i}`);
        if (piece == null) return null;
        out += piece;
      }
      return out;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<boolean> {
  try {
    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(key, value);
      try {
        await SecureStore.deleteItemAsync(`${key}__parts`);
      } catch {
        /* ignore */
      }
      return true;
    }
    const parts = Math.ceil(value.length / CHUNK);
    await SecureStore.setItemAsync(`${key}__parts`, String(parts));
    for (let i = 0; i < parts; i++) {
      await SecureStore.setItemAsync(
        `${key}__${i}`,
        value.slice(i * CHUNK, (i + 1) * CHUNK),
      );
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

async function secureRemove(key: string): Promise<void> {
  try {
    const partsRaw = await SecureStore.getItemAsync(`${key}__parts`);
    if (partsRaw) {
      const n = Number(partsRaw);
      for (let i = 0; i < n; i++) {
        await SecureStore.deleteItemAsync(`${key}__${i}`).catch(
          () => undefined,
        );
      }
      await SecureStore.deleteItemAsync(`${key}__parts`).catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

async function asyncGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function asyncRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const appStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (memory.has(key)) return memory.get(key) ?? null;
    const fromSecure = await secureGet(key);
    if (fromSecure != null) {
      memory.set(key, fromSecure);
      return fromSecure;
    }
    // Legacy plaintext copy from older builds: move it into SecureStore.
    const fromAsync = await asyncGet(key);
    if (fromAsync != null) {
      memory.set(key, fromAsync);
      if (await secureSet(key, fromAsync)) await asyncRemove(key);
      return fromAsync;
    }
    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Always update RAM first so session survives storage failures during sign-in.
    // If SecureStore fails the value stays memory-only; tokens and financial
    // data must never be written to plaintext AsyncStorage.
    memory.set(key, value);
    await secureSet(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    memory.delete(key);
    await secureRemove(key);
    await asyncRemove(key);
  },
};
