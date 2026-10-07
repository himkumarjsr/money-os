import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";
import {
  generateAmortisationTable,
  type AmortisationRow,
} from "@/lib/amortisation";
import { shareAmortisationExcel } from "@/lib/exportExcel";
import { formatINR } from "@/lib/formatINR";
import { formatIndianCompact } from "@/lib/formatters";
import { CalcChart, type ChartSeries } from "./CalcChart";
import { ChartCard, ExcelDownloadButton } from "./calculator-ui";

export function emi(principal: number, annualPct: number, months: number) {
  if (months <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r <= 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

type YearBucket = {
  year: number;
  principalPaid: number;
  interestPaid: number;
  outstanding: number;
};

type TableEntry =
  | { kind: "row"; row: AmortisationRow }
  | {
      kind: "year";
      year: number;
      principal: number;
      interest: number;
      emi: number;
      outstanding: number;
    }
  | { kind: "total"; principal: number; interest: number; emi: number };

export function useLoanSchedule(
  loan: number,
  rate: number,
  months: number,
  e: number,
  loanStartDate: string,
) {
  const amortRows = useMemo(
    () => generateAmortisationTable(loan, rate, months, e, loanStartDate),
    [e, loan, loanStartDate, months, rate],
  );

  const yearlyBreakdown = useMemo(() => {
    const yearsCount = Math.ceil(months / 12);
    const buckets: YearBucket[] = [];
    for (let y = 0; y < yearsCount; y += 1) {
      const start = y * 12;
      const end = Math.min((y + 1) * 12, amortRows.length);
      const slice = amortRows.slice(start, end);
      buckets.push({
        year: y + 1,
        principalPaid: slice.reduce((s, r) => s + r.principal, 0),
        interestPaid: slice.reduce((s, r) => s + r.interest, 0),
        outstanding: slice.length
          ? slice[slice.length - 1].closingBalance
          : loan,
      });
    }
    return buckets;
  }, [amortRows, loan, months]);

  const tableWithSummaries = useMemo(() => {
    const out: TableEntry[] = [];
    let totalP = 0;
    let totalI = 0;
    let totalE = 0;
    for (let i = 0; i < amortRows.length; i += 1) {
      const r = amortRows[i];
      totalP += r.principal;
      totalI += r.interest;
      totalE += r.emi;
      out.push({ kind: "row", row: r });
      const monthIndex1 = i + 1;
      if (monthIndex1 % 12 === 0) {
        const slice = amortRows.slice(i - 11, i + 1);
        out.push({
          kind: "year",
          year: monthIndex1 / 12,
          principal: slice.reduce((s, x) => s + x.principal, 0),
          interest: slice.reduce((s, x) => s + x.interest, 0),
          emi: slice.reduce((s, x) => s + x.emi, 0),
          outstanding: slice[slice.length - 1]?.closingBalance ?? 0,
        });
      }
    }
    out.push({ kind: "total", principal: totalP, interest: totalI, emi: totalE });
    return out;
  }, [amortRows]);

  return { amortRows, yearlyBreakdown, tableWithSummaries };
}

const YEARLY_SERIES: ChartSeries[] = [
  {
    key: "principalPaid",
    label: "Principal paid",
    type: "bar",
    color: "#534AB7",
    stackId: "a",
  },
  {
    key: "interestPaid",
    label: "Interest paid",
    type: "bar",
    color: "#AFA9EC",
    stackId: "a",
  },
];

export function YearlyBreakupChart({
  data,
  showOutstanding,
  footer,
}: {
  data: YearBucket[];
  showOutstanding?: boolean;
  footer: ReactNode;
}) {
  const tickEvery = Math.max(1, Math.ceil(data.length / 5));
  return (
    <ChartCard title="Yearly breakup" footer={footer}>
      <CalcChart
        data={data}
        xKey="year"
        series={YEARLY_SERIES}
        height={200}
        legend={false}
        yTickFormat={(v) => formatIndianCompact(v)}
        xTickFormat={(v, i) =>
          (data.length - 1 - i) % tickEvery === 0 ? `Year ${v}` : ""
        }
        tooltip={(row) => {
          const sep = showOutstanding ? ": " : " : ";
          const lines = [
            `Principal paid${sep}${formatINR(row.principalPaid)}`,
            `Interest paid${sep}${formatINR(row.interestPaid)}`,
          ];
          if (showOutstanding) {
            lines.push(`Outstanding balance: ${formatINR(row.outstanding)}`);
          }
          return { title: `Year ${row.year}`, lines };
        }}
      />
    </ChartCard>
  );
}

export function LoanExcelDownloads({
  rows,
  loan,
  rate,
  tenure,
  e,
  name,
}: {
  rows: AmortisationRow[];
  loan: number;
  rate: number;
  tenure: number;
  e: number;
  name: string;
}) {
  const share = () => shareAmortisationExcel(rows, loan, rate, tenure, e, name);
  return (
    <>
      <View style={styles.linkRow}>
        <Pressable
          onPress={() => void share()}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.linkText}>⬇︎ Download Excel</Text>
        </Pressable>
      </View>
      <ExcelDownloadButton onPress={share} />
    </>
  );
}

const INITIAL_ENTRIES = 13;
const PAGE_ENTRIES = 13 * 5;
const COLS = ["Date", "Principal", "Interest", "EMI", "Outstanding"];
const COL_W = [104, 112, 112, 112, 124];

function Cells({ values, bold }: { values: string[]; bold?: boolean }) {
  return (
    <>
      {values.map((v, i) => (
        <Text
          key={COLS[i]}
          style={[styles.cell, { width: COL_W[i] }, bold && styles.cellBold]}
        >
          {v}
        </Text>
      ))}
    </>
  );
}

export function AmortisationSchedule({
  entries,
  months,
}: {
  entries: TableEntry[];
  months: number;
}) {
  const [visible, setVisible] = useState(INITIAL_ENTRIES);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
    [],
  );
  const shown = entries.slice(0, Math.min(visible, entries.length));
  const hasMore = visible < entries.length;
  const shownMonths = shown.filter((x) => x.kind === "row").length;

  return (
    <View>
      <View style={styles.tableCard}>
        <View style={styles.tableHead}>
          <Text style={styles.tableTitle}>Amortisation Schedule</Text>
          <Text style={styles.tableSub}>Month by month breakdown</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.headerRow}>
              {COLS.map((h, i) => (
                <Text key={h} style={[styles.headerCell, { width: COL_W[i] }]}>
                  {h}
                </Text>
              ))}
            </View>
            {shown.map((entry, idx) => {
              if (entry.kind === "year") {
                return (
                  <View
                    key={`year-${entry.year}`}
                    style={[styles.row, { backgroundColor: "#F4F2FC" }]}
                  >
                    <Cells
                      bold
                      values={[
                        `Year ${entry.year} total`,
                        formatINR(entry.principal),
                        formatINR(entry.interest),
                        formatINR(entry.emi),
                        formatINR(entry.outstanding),
                      ]}
                    />
                  </View>
                );
              }
              if (entry.kind === "total") {
                return (
                  <View
                    key="total"
                    style={[
                      styles.row,
                      { backgroundColor: "rgba(83,74,183,0.10)" },
                    ]}
                  >
                    <Cells
                      bold
                      values={[
                        "TOTAL",
                        formatINR(entry.principal),
                        formatINR(entry.interest),
                        formatINR(entry.emi),
                        "—",
                      ]}
                    />
                  </View>
                );
              }
              const r = entry.row;
              const isCurrent = r.date === todayLabel;
              const bg = isCurrent
                ? "#EEEDFE"
                : idx % 2 === 0
                  ? "#FFFFFF"
                  : "#FAFAFE";
              return (
                <View
                  key={r.month}
                  style={[styles.row, styles.rowBorder, { backgroundColor: bg }]}
                >
                  <Cells
                    bold={isCurrent}
                    values={[
                      r.date,
                      formatINR(r.principal),
                      formatINR(r.interest),
                      formatINR(r.emi),
                      formatINR(r.closingBalance),
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.moreRow}>
        {hasMore ? (
          <Pressable
            onPress={() => setVisible((v) => v + PAGE_ENTRIES)}
            accessibilityRole="button"
            style={styles.moreBtn}
          >
            <Text style={styles.moreText}>
              Show more ({shownMonths} of {months} months)
            </Text>
          </Pressable>
        ) : null}
        {visible > INITIAL_ENTRIES ? (
          <Pressable
            onPress={() => setVisible(INITIAL_ENTRIES)}
            accessibilityRole="button"
            style={styles.moreBtn}
          >
            <Text style={styles.moreText}>Show less</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: "row", justifyContent: "flex-end" },
  linkBtn: { minHeight: 44, justifyContent: "center" },
  linkText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EFF8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  tableHead: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFF8",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tableTitle: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  tableSub: { fontSize: 12, color: "#64748B" },
  headerRow: { flexDirection: "row", backgroundColor: Colors.primary },
  headerCell: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  row: { flexDirection: "row" },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F0EFF8" },
  cell: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
  },
  cellBold: { fontWeight: "600" },
  moreRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, paddingTop: 4 },
  moreBtn: { minHeight: 44, justifyContent: "center" },
  moreText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
});
