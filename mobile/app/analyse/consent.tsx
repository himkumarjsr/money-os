import { View, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { acceptAnalyseConsent } from "@/lib/analyseConsent";
import { ConsentSheet } from "@/components/analyse/ConsentSheet";
import { Colors, themedStyles } from "@/constants/theme";

export default function AnalyseConsentScreen() {
  const user = useAuthStore((s) => s.user);

  const onAccept = () => {
    void (async () => {
      if (user?.id) await acceptAnalyseConsent(user.id);
      router.replace("/analyse/form");
    })();
  };

  const onDecline = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/analyse");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <Pressable style={styles.backdrop} onPress={onDecline} />
      <View style={styles.sheetWrap}>
        <ConsentSheet onAccept={onAccept} onDecline={onDecline} />
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetWrap: {
    maxHeight: "92%",
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
}));
