/** Native KYC - port of the web stub app/kyc/page.tsx. */
import { Text } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";

export default function KycScreen() {
  return (
    <ContentScreen barTitle="KYC">
      <Text style={styles.h1}>KYC status</Text>
      <Text style={styles.body}>
        PAN and Aadhaar verification status appears here.
      </Text>
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  h1: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },
  body: { marginTop: 8, fontSize: 14, color: Colors.textSecondary },
}));
