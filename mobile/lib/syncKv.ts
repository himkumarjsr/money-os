/**
 * Synchronous key-value cache for modules ported from web that expect
 * `localStorage` semantics (read/write without awaiting). Values live in
 * memory and are mirrored to device storage; call `hydrateSyncKv()` once at
 * app start so earlier sessions' values are readable synchronously.
 *
 * Financial payloads (SECURE_KEYS) are mirrored to SecureStore via
 * `appStorage`, never to AsyncStorage, which is plaintext on disk.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { appStorage } from "@/lib/storage";

const PREFIX = "finkoin_";
const SECURE_KEYS = new Set<string>([
  "finkoin_ai_cache",
  "finkoin_ai_forced_refresh_at",
]);
const memory = new Map<string, string>();
let hydration: Promise<void> | null = null;

export function hydrateSyncKv(): Promise<void> {
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter(
        (k) => k.startsWith(PREFIX) && !SECURE_KEYS.has(k),
      );
      const pairs = keys.length > 0 ? await AsyncStorage.multiGet(keys) : [];
      for (const [k, v] of pairs) {
        // Writes made before hydration finished win over stored values.
        if (v != null && !memory.has(k)) memory.set(k, v);
      }
    } catch {
      /* storage unavailable — memory-only for this session */
    }
    for (const k of SECURE_KEYS) {
      // appStorage also moves any legacy plaintext copy into SecureStore.
      const v = await appStorage.getItem(k);
      if (v != null && !memory.has(k)) memory.set(k, v);
    }
  })();
  return hydration;
}

export const syncKv = {
  getItem(key: string): string | null {
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    if (SECURE_KEYS.has(key)) {
      void appStorage.setItem(key, value);
      return;
    }
    void AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem(key: string): void {
    memory.delete(key);
    if (SECURE_KEYS.has(key)) {
      void appStorage.removeItem(key);
      return;
    }
    void AsyncStorage.removeItem(key).catch(() => {});
  },
};
