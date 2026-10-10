import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import {
  deletePlannedInvestment,
  fetchPlannedInvestments,
  formatStartMonth,
  setPlannedInvestmentStatus,
  type PlannedInvestment,
} from "@/lib/plannedInvestments";
import { getSupabase } from "@/lib/supabase";

/** Matches web PlannedInvestmentsSection: consented Fix Plan reminders, marked started by the user. */
export function PlannedInvestmentsSection({ userId }: { userId: string }) {
  const [rows, setRows] = useState<PlannedInvestment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await fetchPlannedInvestments(getSupabase(), userId));
    } catch {
      setRows([]);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: PlannedInvestment[] }>();
    for (const r of rows) {
      const g = map.get(r.source_id) ?? { label: r.source_label, rows: [] };
      g.rows.push(r);
      map.set(r.source_id, g);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (rows.length === 0) return null;

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setError("");
    try {
      await fn();
      await load();
    } catch {
      setError("Couldn't update that. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const total = rows.reduce((s, r) => s + r.monthly_amount, 0);
  const started = rows.filter((r) => r.status !== "pending").length;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>Planned investments</Text>
        <Text style={styles.headMeta}>
          ₹{total.toLocaleString("en-IN")}/mo · {started}/{rows.length} started
        </Text>
      </View>
      {groups.map(([sourceId, g], gi) => (
        <View
          key={sourceId}
          style={[styles.group, gi < groups.length - 1 && styles.divider]}
        >
          <Text style={styles.groupTitle}>{g.label}</Text>
          {g.rows.map((r) => {
            const isStarted = r.status !== "pending";
            const busy = busyId === r.id;
            return (
              <View key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.instrument}>{r.instrument_label}</Text>
                  <Text style={styles.meta}>
                    ₹{r.monthly_amount.toLocaleString("en-IN")}/mo ·{" "}
                    {isStarted
                      ? "✓ Started"
                      : `Starts ${formatStartMonth(r.start_month)}`}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() =>
                    void run(r.id, () =>
                      setPlannedInvestmentStatus(
                        getSupabase(),
                        userId,
                        r.id,
                        isStarted ? "pending" : "started",
                      ),
                    )
                  }
                  style={[
                    styles.btn,
                    isStarted ? styles.btnGhost : styles.btnPrimary,
                    busy && { opacity: 0.5 },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      { color: isStarted ? "#5F5E5A" : "#fff" },
                    ]}
                  >
                    {isStarted ? "Undo" : "Mark started"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${r.instrument_label} for ${g.label}`}
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Remove reminder?",
                      `Remove the ${r.instrument_label} reminder for ${g.label}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () =>
                            void run(r.id, () =>
                              deletePlannedInvestment(
                                getSupabase(),
                                userId,
                                r.id,
                              ),
                            ),
                        },
                      ],
                    )
                  }
                  style={[styles.btn, busy && { opacity: 0.5 }]}
                >
                  <Text style={[styles.btnText, { color: Colors.error }]}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={styles.foot}>
        Reminders only. Nothing is invested automatically. Start each SIP
        yourself, then mark it started.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headTitle: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  headMeta: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  group: { paddingHorizontal: 14, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.background },
  groupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  instrument: { fontSize: 13, color: Colors.textSecondary },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  btn: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnGhost: { backgroundColor: Colors.surfaceMuted },
  btnText: { fontSize: 12, fontWeight: "700" },
  foot: {
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 11,
    color: Colors.textMuted,
  },
  error: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    fontSize: 12,
    color: Colors.error,
  },
}));
