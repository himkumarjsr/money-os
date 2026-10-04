/**
 * Synchronous key-value cache for modules ported from web that expect
 * `localStorage` semantics (read/write without awaiting). Values live in
 * memory and are mirrored to AsyncStorage; call `hydrateSyncKv()` once at
 * app start so earlier sessions' values are readable synchronously.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "finkoin_";
const memory = new Map<string, string>();
let hydration: Promise<void> | null = null;

export function hydrateSyncKv(): Promise<void> {
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
        k.startsWith(PREFIX),
      );
      if (keys.length === 0) return;
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, v] of pairs) {
        // Writes made before hydration finished win over stored values.
        if (v != null && !memory.has(k)) memory.set(k, v);
      }
    } catch {
      /* storage unavailable — memory-only for this session */
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
    void AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem(key: string): void {
    memory.delete(key);
    void AsyncStorage.removeItem(key).catch(() => {});
  },
};
