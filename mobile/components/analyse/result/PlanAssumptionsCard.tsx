import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  EQUITY_RETURN_OPTIONS,
  INFLATION_SHIFT_OPTIONS,
  assumptionChoices,
  planAssumptionRows,
  withAssumption,
} from "@/lib/planAssumptions";

function Pills<T extends string | number>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillGroup}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.pills} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              disabled={disabled}
              onPress={() => !selected && onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              style={[
                styles.pill,
                selected && styles.pillOn,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[styles.pillText, selected && styles.pillTextOn]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** "What we assumed": the plan's returns, inflation, tax and SIP raise (same as web). */
export function PlanAssumptionsCard({
  profile,
  saving,
  onChange,
}: {
  profile: FinancialProfile;
  saving?: boolean;
  onChange: (next: FinancialProfile) => void;
}) {
  const rows = useMemo(() => planAssumptionRows(profile), [profile]);
  const choice = assumptionChoices(profile);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>What we assumed</Text>
      <Text style={styles.sub}>
        Every amount above uses these numbers. Change one and the plan updates.
      </Text>
      <View style={{ gap: 8, marginTop: 12 }}>
        {rows.map((r) => (
          <View key={r.label}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowValue}>{r.value}</Text>
          </View>
        ))}
      </View>
      <Pills
        label="Equity return to plan on"
        options={EQUITY_RETURN_OPTIONS.map((v) => ({
          value: v,
          label: v === 12 ? "12% (standard)" : `${v}%`,
        }))}
        value={choice.equityReturnPct}
        disabled={saving}
        onChange={(v) =>
          onChange(withAssumption(profile, { equityReturnPct: v }))
        }
      />
      <Pills
        label="How fast will costs rise?"
        options={INFLATION_SHIFT_OPTIONS}
        value={choice.inflationShiftPct}
        disabled={saving}
        onChange={(v) =>
          onChange(withAssumption(profile, { inflationShiftPct: v }))
        }
      />
      <Pills
        label="Raise your SIPs every year?"
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No, keep them flat" },
        ]}
        value={choice.raisesSips ? "yes" : "no"}
        disabled={saving}
        onChange={(v) =>
          onChange(withAssumption(profile, { raisesSips: v === "yes" }))
        }
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    padding: 16,
  },
  title: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  sub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  rowLabel: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  rowValue: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  pillGroup: { marginTop: 12, gap: 6 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.card,
    justifyContent: "center",
  },
  pillOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 13, fontWeight: "600", color: Colors.primaryText },
  pillTextOn: { color: Colors.onPrimary },
  disabled: { opacity: 0.6 },
}));
