import { Alert } from "react-native";
import { syncKv } from "@/lib/syncKv";

const LAST_CRASH_KEY = "finkoin_last_js_crash";

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsShape = {
  getGlobalHandler: () => GlobalHandler;
  setGlobalHandler: (handler: GlobalHandler) => void;
};

function describe(error: unknown): string {
  if (error instanceof Error) {
    const frame = (error.stack ?? "").split("\n").slice(1, 3).join("\n");
    return `${error.name}: ${error.message}${frame ? `\n${frame}` : ""}`;
  }
  return String(error);
}

/**
 * Release builds close the app on any uncaught JS error with no message.
 * Keep the app open, remember the error, and show it so it can be reported.
 */
export function installCrashReporter(): void {
  if (__DEV__) return;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape })
    .ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    const text = describe(error);
    try {
      syncKv.setItem(
        LAST_CRASH_KEY,
        JSON.stringify({ at: new Date().toISOString(), isFatal, text }),
      );
    } catch {
      // Storage unavailable — still show the alert.
    }
    if (!isFatal) {
      previous(error, isFatal);
      return;
    }
    Alert.alert(
      "Something went wrong",
      `Please send a screenshot of this to hello@finkoin.com.\n\n${text}`,
    );
  });
}

export function readLastCrash(): string | null {
  return syncKv.getItem(LAST_CRASH_KEY);
}
