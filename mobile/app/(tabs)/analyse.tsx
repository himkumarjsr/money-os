/**
 * Report tab — web parity with `/analyse` (AnalyseEntryClient):
 * signed out → marketing landing; signed in with a saved report → the report
 * (which has a Retake button); otherwise the consent check, then the form.
 */
import { useCallback, useRef } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { hasAnalyseConsent } from "@/lib/analyseConsent";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";
import { Colors, themedStyles } from "@/constants/theme";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AnalyseMarketingLanding } from "@/components/landing/AnalyseMarketingLanding";

/** A report in the store, or one restored from `user_analyse_snapshots`. */
async function hasSavedReport(userId: string): Promise<boolean> {
  const st = useFinancialStore.getState();
  if (st.result && st.lastSubmission) return true;
  try {
    const snap = await fetchUserAnalyseSnapshot(userId);
    if (
      snap?.lastSubmission &&
      snap.result &&
      isValidStoredAnalysis(snap.result)
    ) {
      useFinancialStore
        .getState()
        .hydrateFromSnapshot(snap.lastSubmission, snap.result, {
          analysisPatch: snap.analysis ?? undefined,
        });
      return true;
    }
  } catch {
    // No saved report we can read: go to the form.
  }
  return false;
}

export default function AnalyseScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  // True once this tab has pushed consent/form; coming back to the tab then
  // means the user backed out, so send them home instead of re-pushing.
  const pushedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn || !user?.id) {
        pushedRef.current = false;
        return;
      }
      if (pushedRef.current) {
        pushedRef.current = false;
        router.replace("/(tabs)");
        return;
      }
      let cancelled = false;
      void (async () => {
        if (await hasSavedReport(user.id)) {
          if (cancelled) return;
          pushedRef.current = true;
          router.push("/analyse/result");
          return;
        }
        const ok = await hasAnalyseConsent(user.id);
        if (cancelled) return;
        pushedRef.current = true;
        router.push(ok ? "/analyse/form" : "/analyse/consent");
      })();
      return () => {
        cancelled = true;
      };
    }, [isLoggedIn, user?.id]),
  );

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AnalyseMarketingLanding />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.center}>
        <LoadingSpinner full />
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
}));
