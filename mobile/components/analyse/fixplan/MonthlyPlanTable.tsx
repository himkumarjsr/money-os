import { ScrollView, Text, View } from "react-native";
import type { PriorityPlan } from "@/lib/priorityEngine";
import { groupMonthlyPlan, type MonthGroup } from "@/lib/monthlyPlanGroups";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import { inr, shared } from "./shared";

type Row = NonNullable<PriorityPlan["monthlyPlan"]>[number];
type Col = {
  key: string;
  label: string;
  width: number;
  render: (m: MonthGroup) => string;
  show: boolean;
};

export function MonthlyPlanTable({ rows }: { rows: Row[] }) {
  const has = (k: keyof Row) => rows.some((m) => Number(m?.[k] || 0) > 0);
  const cols: Col[] = (
    [
      {
        key: "month",
        label: "Month",
        width: 72,
        render: (m) => m.label,
        show: true,
      },
      {
        key: "emergency",
        label: "Emergency",
        width: 104,
        render: (m) => `₹${inr(m.emergency)}`,
        show: has("emergency"),
      },
      {
        key: "medical",
        label: "Medical",
        width: 104,
        render: (m) => `₹${inr(m.medical)}`,
        show: has("medical"),
      },
      {
        key: "termYearly",
        label: "Term (yearly)",
        width: 112,
        render: (m) => `₹${inr(m.termYearly)}`,
        show: has("termYearly"),
      },
      {
        key: "sip",
        label: "SIP",
        width: 96,
        render: (m) => `₹${inr(m.sip)}`,
        show: has("sip"),
      },
      {
        key: "extraDebt",
        label: "Extra debt",
        width: 104,
        render: (m) => `₹${inr(m.extraDebt)}`,
        show: has("extraDebt"),
      },
      {
        key: "remaining",
        label: "Remaining",
        width: 104,
        render: (m) => `₹${inr(m.remaining)}`,
        show: true,
      },
      {
        key: "note",
        label: "Note",
        width: 280,
        render: (m) => m.note ?? "",
        show: true,
      },
    ] satisfies Col[]
  ).filter((c) => c.show);

  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>
        Month-wise plan for the next 12 months
      </Text>
      <Text style={styles.hint}>
        Months that repeat the same split are shown together.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.scroll}
        contentContainerStyle={styles.table}
      >
        <View>
          <View style={[styles.tr, styles.thead]}>
            {cols.map((c) => (
              <Text key={c.key} style={[styles.th, { width: c.width }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {groupMonthlyPlan(rows).map((m) => (
            <View
              key={`month-plan-${m.fromMonth}`}
              style={[styles.tr, styles.trBody]}
            >
              {cols.map((c) => (
                <Text
                  key={c.key}
                  style={[
                    styles.td,
                    { width: c.width },
                    c.key === "month" && styles.tdMonth,
                    c.key === "note" && styles.tdNote,
                  ]}
                >
                  {c.render(m)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  scroll: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  table: { flexGrow: 1 },
  hint: { marginTop: 4, fontSize: 12, color: Colors.textSecondary },
  tr: { flexDirection: "row" },
  thead: { backgroundColor: Colors.background },
  trBody: { borderTopWidth: 1, borderTopColor: Colors.surfaceMuted },
  th: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  td: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  tdMonth: { fontWeight: "500" },
  tdNote: { fontSize: 12, color: Colors.textSecondary },
}));
