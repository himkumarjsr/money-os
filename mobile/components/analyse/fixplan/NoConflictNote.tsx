import { Text, View } from "react-native";
import { Radius, Spacing, themedStyles, tintBg } from "@/constants/theme";
import { NO_CONFLICT_BODY, NO_CONFLICT_TITLE } from "@/lib/reportTrust";

/** Matches web NoConflictNote. */
export function NoConflictNote() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{NO_CONFLICT_TITLE}</Text>
      <Text style={styles.body}>{NO_CONFLICT_BODY}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  box: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: tintBg("#D5F0E6"),
    backgroundColor: tintBg("#F1FBF7"),
    padding: Spacing.lg,
  },
  title: { fontSize: 15, fontWeight: "600", color: "#0F6E56" },
  body: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#2E5E50" },
}));
