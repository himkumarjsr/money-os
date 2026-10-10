import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors, themedStyles, tintBg, tintFg } from "@/constants/theme";
import { openWebPage } from "@/lib/openWebPage";
import {
  FINKOIN_AGENT_CODE,
  insurerFormDownloadUrl,
  insurerRenewalWebsite,
  type PolicyType,
  type UserPolicy,
} from "@/lib/policyVault";

const MOCK_COMPARE_COUNT = 12;
const MOCK_ALTS = [
  {
    name: "Niva Bupa ReAssure 2.0",
    blurb: "Higher NCB stack, restore & wellness",
  },
  {
    name: "HDFC ERGO Optima Restore",
    blurb: "Similar cover, multi-year discounts",
  },
];

function isLifeCategory(t: PolicyType): boolean {
  return t === "term_life" || t === "travel" || t === "other";
}

function isHealthCategory(t: PolicyType): boolean {
  return t === "health";
}

function SheetTitle({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>{title}</Text>
      <Pressable
        onPress={onClose}
        style={styles.closeBtn}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  bg,
  color = "#FFFFFF",
  border,
  loading,
}: {
  label: string;
  onPress: () => void;
  bg: string;
  color?: string;
  border?: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        border ? { borderWidth: 1.5, borderColor: border } : null,
        (pressed || loading) && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.btnText, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function RenewOptionsSheet({
  policy,
  onClose,
  onCompare,
  onStartTransfer,
}: {
  policy: UserPolicy | null;
  onClose: () => void;
  onCompare: (p: UserPolicy) => void;
  onStartTransfer: (p: UserPolicy) => void;
}) {
  return (
    <BottomSheet visible={!!policy} onClose={onClose} scroll>
      <SheetTitle title="Renewal options" onClose={onClose} />
      {policy ? (
        <View style={{ gap: 16, paddingBottom: 8 }}>
          <View style={[styles.card, styles.cardPlain]}>
            <Text style={styles.cardTitle}>Renew same policy</Text>
            <Text style={styles.cardBody}>
              We will redirect you to {policy.insurerName} website
            </Text>
            <Text style={styles.cardMeta}>
              Commission: None — this is for your convenience
            </Text>
            <ActionButton
              label={`Go to ${policy.insurerName} →`}
              bg={Colors.card}
              color={Colors.textPrimary}
              border={tintBg("#E2E8F0")}
              onPress={() =>
                openWebPage(insurerRenewalWebsite(policy.insurerName))
              }
            />
          </View>

          <View style={[styles.card, styles.cardCompare]}>
            <Text style={styles.cardTitle}>Compare better plans</Text>
            <Text style={styles.cardBody}>
              We found {MOCK_COMPARE_COUNT} plans with better features at
              similar or lower premium
            </Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {MOCK_ALTS.map((a) => (
                <View key={a.name} style={styles.alt}>
                  <Text style={styles.altText}>
                    <Text style={{ fontWeight: "700" }}>{a.name}</Text> —{" "}
                    {a.blurb}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[styles.cardMeta, { fontSize: 11 }]}>
              Commission: Full first year if they switch
            </Text>
            <ActionButton
              label="Compare plans →"
              bg={Colors.primary}
              onPress={() => onCompare(policy)}
            />
          </View>

          <View style={[styles.card, styles.cardTeal]}>
            <Text style={[styles.cardTitle, { color: tintFg("#134E4A") }]}>
              Transfer to Finkoin first
            </Text>
            <Text style={[styles.cardBody, { color: tintFg("#115E59") }]}>
              Transfer this policy to Finkoin. We will remind you every renewal.
              You get free annual policy review.
            </Text>
            <ActionButton
              label="Start transfer →"
              bg="#0D9488"
              onPress={() => onStartTransfer(policy)}
            />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNum}>{n}.</Text>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

function B({ children }: { children: ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

export function TransferGuideSheet({
  policy,
  onClose,
  onMarkTransferred,
}: {
  policy: UserPolicy | null;
  onClose: () => void;
  onMarkTransferred: (p: UserPolicy) => Promise<void>;
}) {
  const [marking, setMarking] = useState(false);
  const policyNo = policy?.policyNumber || "(add in Edit if missing)";

  return (
    <BottomSheet visible={!!policy} onClose={onClose} scroll>
      <SheetTitle title="Transfer guide" onClose={onClose} />
      {policy ? (
        <View style={{ gap: 20, paddingBottom: 8 }}>
          {isLifeCategory(policy.policyType) ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Life insurance</Text>
              <Step n={1}>
                Download <B>Change of Agent</B> form from {policy.insurerName}{" "}
                website.
              </Step>
              <Step n={2}>
                Fill: your policy number <B>{policyNo}</B>, new agent name{" "}
                <B>Finkoin Financial Services</B>, new agent code{" "}
                <B>{FINKOIN_AGENT_CODE}</B>.
              </Step>
              <Step n={3}>
                Submit at nearest branch OR upload on insurer portal.
              </Step>
              <Step n={4}>Processing usually takes 30–60 days.</Step>
            </View>
          ) : isHealthCategory(policy.policyType) ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Health insurance</Text>
              <Step n={1}>
                Download the <B>intermediary change / portability support</B>{" "}
                form from {policy.insurerName} (wording varies by insurer).
              </Step>
              <Step n={2}>
                Fill policy number <B>{policyNo}</B>, new advisor{" "}
                <B>Finkoin Financial Services</B>, code{" "}
                <B>{FINKOIN_AGENT_CODE}</B>.
              </Step>
              <Step n={3}>
                Submit via branch, email, or insurer logged-in portal as
                directed.
              </Step>
              <Step n={4}>Allow a few weeks for records to update.</Step>
              <Step n={5}>
                After transfer, we handle renewal reminders and optional annual
                review.
              </Step>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Motor / other policies</Text>
              <Text style={styles.stepText}>
                Contact {policy.insurerName} support or your RM and request
                servicing be moved to <B>Finkoin Financial Services</B> (agent
                code {FINKOIN_AGENT_CODE}). Steps differ by insurer; we can help
                over chat once live.
              </Text>
            </View>
          )}

          <ActionButton
            label="Open insurer site for forms →"
            bg={Colors.card}
            color={Colors.primary}
            border={Colors.primary}
            onPress={() =>
              openWebPage(insurerFormDownloadUrl(policy.insurerName))
            }
          />
          <ActionButton
            label="Mark as transferred to Finkoin"
            bg={Colors.violet600}
            loading={marking}
            onPress={async () => {
              setMarking(true);
              await onMarkTransferred(policy);
              setMarking(false);
            }}
          />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, color: Colors.textMuted },
  card: { borderRadius: 16, padding: 16 },
  cardPlain: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cardCompare: {
    borderWidth: 2,
    borderColor: "rgba(83,74,183,0.4)",
    backgroundColor: Colors.surfaceMuted,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTeal: {
    borderWidth: 1,
    borderColor: Colors.successLight,
    backgroundColor: Colors.successLight,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  cardBody: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  cardMeta: { marginTop: 8, fontSize: 12, color: Colors.textMuted },
  alt: {
    backgroundColor: Colors.glassCard,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  altText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  btn: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  btnText: { fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  step: { flexDirection: "row", gap: 8 },
  stepNum: {
    width: 18,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  bold: { fontWeight: "700", color: Colors.textPrimary },
}));
