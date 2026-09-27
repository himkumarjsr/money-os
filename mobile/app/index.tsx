import { Redirect } from "expo-router";

/**
 * Keep a root `/` so deep links & Expo Go open reliably.
 * Landing lives at tabs `index` (same group as bottom nav).
 */
export default function RootIndex() {
  return <Redirect href="/(tabs)" />;
}
