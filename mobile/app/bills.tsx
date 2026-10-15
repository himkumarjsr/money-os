/**
 * Bills & renewals calendar — port of web app/bills/page.tsx.
 * Obligations, card due days and policy renewals for one month, with
 * Mark paid / Skip / Edit and an add-bill sheet.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import {
  AddObligationForm,
  type ObligationFormPayload,
} from "@/components/tracker/AddObligationForm";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { Colors, themedStyles } from "@/constants/theme";
import {
  MONTH_NAMES,
  billsByDay,
  buildBillsMonth,
  describeSchedule,
  monthGrid,
  parseYmd,
  type BillItem,
  type BillObligation,
  type BillStatus,
} from "@/lib/billsCalendar";
import {
  loadBillsData,
  setBillStatus,
  type BillsData,
} from "@/lib/billsCalendarData";
import { useAuthStore } from "@/store/authStore";
import { useObligationStore } from "@/store/obligationStore";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const STATUS_LABEL: Record<BillStatus, string> = {
  paid: "Paid",
  skipped: "Skipped",
  overdue: "Overdue",
  due: "Due",
  info: "Reminder",
};

function statusColors(status: BillStatus): { fg: string; bg: string } {
  switch (status) {
    case "paid":
      return { fg: Colors.success, bg: Colors.successLight };
    case "overdue":
      return { fg: Colors.error, bg: Colors.errorLight };
    case "due":
      return { fg: Colors.primaryText, bg: Colors.primaryLight };
    default:
      return { fg: Colors.textMuted, bg: Colors.surfaceAlt };
  }
}

type Editing = { id: string; payload: ObligationFormPayload };

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function dayHeading(ymd: string): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function BillsScreen() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [data, setData] = useState<BillsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadError(null);
      setData(await loadBillsData(userId, cursor.year, cursor.monthIndex));
    } catch (err) {
      console.warn("bills load failed:", err);
      setLoadError("Couldn't load your bills. Pull down to try again.");
    }
  }, [userId, cursor.year, cursor.monthIndex]);

  useEffect(() => {
    setData(null);
    setSelectedDay(null);
    void reload();
  }, [reload]);

  useEffect(() => {
    // Keep the store's obligation list warm so edits keep remind_days_before.
    if (userId) void useObligationStore.getState().fetchObligations(userId);
  }, [userId]);

  const today = useMemo(() => new Date(), []);
  const month = useMemo(
    () =>
      data
        ? buildBillsMonth({
            year: cursor.year,
            monthIndex: cursor.monthIndex,
            today,
            ...data,
          })
        : null,
    [data, cursor.year, cursor.monthIndex, today],
  );
  const byDay = useMemo(
    () => (month ? billsByDay(month.items) : new Map<number, BillItem[]>()),
    [month],
  );
  const cells = monthGrid(cursor.year, cursor.monthIndex);
  const isThisMonth =
    cursor.year === today.getFullYear() &&
    cursor.monthIndex === today.getMonth();

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.monthIndex + delta, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });

  const visible = month
    ? selectedDay == null
      ? month.items
      : month.items.filter((i) => i.day === selectedDay)
    : [];
  const groups: { date: string; items: BillItem[] }[] = [];
  for (const item of visible) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }

  const amountText = (n: number) => (showAmounts ? rupees(n) : "₹••••");

  const changeStatus = async (
    item: BillItem,
    status: "paid" | "skipped" | "pending",
  ) => {
    if (!userId) return;
    setBusyKey(item.key);
    try {
      await setBillStatus(userId, item, status);
      await reload();
    } catch (err) {
      console.warn("bills status failed:", err);
      setLoadError("Couldn't update that bill. Try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const findObligation = (id?: string): BillObligation | undefined =>
    data?.obligations.find((o) => o.id === id);

  const startEdit = (ob: BillObligation) => {
    const full = useObligationStore
      .getState()
      .obligations.find((o) => o.id === ob.id);
    setAdding(false);
    setEditing({
      id: ob.id,
      payload: {
        title: ob.title,
        category: ob.category,
        amount: ob.amount,
        frequency: ob.frequency,
        due_day: ob.due_day ?? null,
        due_month: ob.due_month ?? null,
        due_date: ob.due_date ?? null,
        source: "manual",
        is_active: true,
        remind_days_before: full?.remind_days_before ?? 7,
      },
    });
  };

  const handleAdd = async (payload: ObligationFormPayload) => {
    if (!userId) return;
    const id = await useObligationStore
      .getState()
      .addObligation({ ...payload, user_id: userId });
    if (!id) throw new Error("addObligation failed");
    setAdding(false);
    await reload();
  };

  const handleUpdate = async (payload: ObligationFormPayload) => {
    if (!editing) return;
    const ok = await useObligationStore
      .getState()
      .updateObligation(editing.id, {
        title: payload.title,
        category: payload.category,
        amount: payload.amount,
        frequency: payload.frequency,
        due_day: payload.due_day,
        due_month: payload.due_month,
        due_date: payload.due_date ?? null,
        remind_days_before: payload.remind_days_before,
      });
    if (!ok) throw new Error("updateObligation failed");
    setEditing(null);
    await reload();
  };

  const totals = month?.totals;
  const progress =
    totals && totals.total > 0
      ? Math.min(100, (totals.paid / totals.total) * 100)
      : 0;

  return (
    <PageScaffold
      title="Bills & renewals"
      subtitle="EMIs, premiums, utility bills, card due dates and renewals in one place. We remind you before each one."
      requireAuth
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void reload().finally(() => setRefreshing(false));
      }}
      right={
        <Pressable
          onPress={() => {
            setEditing(null);
            setAdding(true);
          }}
          accessibilityRole="button"
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Add bill</Text>
        </Pressable>
      }
    >
      <View style={styles.monthBar}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={styles.navBtn}
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[cursor.monthIndex]} {cursor.year}
          </Text>
          {!isThisMonth ? (
            <Pressable
              onPress={() =>
                setCursor({
                  year: today.getFullYear(),
                  monthIndex: today.getMonth(),
                })
              }
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.linkSmall}>Back to this month</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => shiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.navBtn}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      {loadError ? (
        <Pressable
          onPress={() => void reload()}
          accessibilityRole="button"
          style={styles.errorBox}
        >
          <Text style={styles.errorText}>{loadError} Tap to retry.</Text>
        </Pressable>
      ) : null}

      {!month ? (
        <View style={[pageStyles.card, { alignItems: "center" }]}>
          <Text style={styles.muted}>
            {loadError ? "Nothing to show yet." : "Loading your bills…"}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>
                  {isThisMonth ? "Still to pay this month" : "To pay"}
                </Text>
                <Text style={styles.summaryAmount}>
                  {amountText(month.totals.pending)}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowAmounts((v) => !v)}
                accessibilityRole="button"
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>
                  {showAmounts ? "Hide amounts" : "Show amounts"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.summaryFoot}>
              <Text style={styles.summaryLabel}>
                ✓ Paid {amountText(month.totals.paid)} of{" "}
                {amountText(month.totals.total)}
              </Text>
              <Text style={styles.summaryLabel}>
                {month.totals.overdueCount > 0
                  ? `${month.totals.overdueCount} overdue`
                  : `${month.totals.dueCount} coming up`}
              </Text>
            </View>
          </View>

          <View style={[pageStyles.card, styles.calendar]}>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((d, i) => (
                <Text key={`${d}${i}`} style={styles.weekday}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day == null) {
                  return <View key={`pad-${i}`} style={styles.cell} />;
                }
                const dayItems = byDay.get(day) ?? [];
                const isToday = isThisMonth && day === today.getDate();
                const selected = selectedDay === day;
                return (
                  <View key={day} style={styles.cell}>
                    <Pressable
                      disabled={dayItems.length === 0}
                      onPress={() => setSelectedDay(selected ? null : day)}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${MONTH_NAMES[cursor.monthIndex]}: ${dayItems.length} bill${dayItems.length === 1 ? "" : "s"}`}
                      accessibilityState={{ selected }}
                      style={[
                        styles.dayBtn,
                        isToday && styles.dayToday,
                        selected && styles.daySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          (isToday || selected) && {
                            color: Colors.primaryText,
                          },
                        ]}
                      >
                        {day}
                      </Text>
                      <View style={styles.dots}>
                        {dayItems.slice(0, 3).map((it) => (
                          <View
                            key={it.key}
                            style={[
                              styles.dot,
                              { backgroundColor: statusColors(it.status).fg },
                            ]}
                          />
                        ))}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {month.undated.length > 0 ? (
            <View style={styles.undated}>
              <Text style={styles.undatedTitle}>
                {month.undated.length === 1
                  ? "1 bill needs a date"
                  : `${month.undated.length} bills need a date`}
              </Text>
              <Text style={styles.undatedBody}>
                Add the month or date so it shows here and we can remind you.
              </Text>
              <View style={styles.chips}>
                {month.undated.map((ob) => (
                  <Pressable
                    key={ob.id}
                    onPress={() => startEdit(ob)}
                    accessibilityRole="button"
                    style={styles.undatedChip}
                  >
                    <Text style={styles.undatedChipText}>
                      {ob.title} · Set date
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.listHead}>
            <Text style={styles.listTitle}>
              {selectedDay == null
                ? "This month"
                : `${selectedDay} ${MONTH_NAMES[cursor.monthIndex]}`}
            </Text>
            {selectedDay != null ? (
              <Pressable
                onPress={() => setSelectedDay(null)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.linkSmall}>Show all</Text>
              </Pressable>
            ) : null}
          </View>

          {groups.length === 0 ? (
            <View style={[pageStyles.card, { alignItems: "center" }]}>
              <Text style={styles.emptyTitle}>Nothing due this month</Text>
              <Text style={[styles.muted, { textAlign: "center" }]}>
                Add rent, EMIs, electricity, school fees, PUC or a passport
                expiry, and we&apos;ll remind you before each one.
              </Text>
              <Pressable
                onPress={() => setAdding(true)}
                accessibilityRole="button"
                style={[pageStyles.primaryBtn, { marginTop: 14 }]}
              >
                <Text style={pageStyles.primaryBtnText}>
                  Add your first bill
                </Text>
              </Pressable>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.date} style={styles.group}>
                <Text style={styles.groupHead}>{dayHeading(g.date)}</Text>
                {g.items.map((item, idx) => {
                  const ob = findObligation(item.obligationId);
                  return (
                    <BillRow
                      key={item.key}
                      item={item}
                      last={idx === g.items.length - 1}
                      busy={busyKey === item.key}
                      amountText={amountText}
                      schedule={ob ? describeSchedule(ob) : null}
                      onStatus={(s) => void changeStatus(item, s)}
                      onEdit={() => {
                        if (ob) startEdit(ob);
                      }}
                    />
                  );
                })}
              </View>
            ))
          )}

          <Text style={[styles.muted, styles.footNote]}>
            Bills you log in Tracker tick themselves off here when the amount
            matches.
          </Text>
        </>
      )}

      <BottomSheet
        visible={adding || editing != null}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        scroll
      >
        <AddObligationForm
          key={editing ? `edit-${editing.id}` : "add-bill"}
          noun="bill"
          initial={editing?.payload}
          defaults={{ category: "bill_electricity" }}
          onSave={editing ? handleUpdate : handleAdd}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      </BottomSheet>
    </PageScaffold>
  );
}

function BillRow({
  item,
  last,
  busy,
  amountText,
  schedule,
  onStatus,
  onEdit,
}: {
  item: BillItem;
  last: boolean;
  busy: boolean;
  amountText: (n: number) => string;
  schedule: string | null;
  onStatus: (s: "paid" | "skipped" | "pending") => void;
  onEdit: () => void;
}) {
  const colors = statusColors(item.status);
  const done = item.status === "paid" || item.status === "skipped";
  const subtitle =
    item.kind === "card"
      ? "Credit card due date"
      : item.kind === "policy"
        ? "Policy renewal"
        : schedule;

  return (
    <View
      style={[styles.row, !last && styles.rowDivider, busy && { opacity: 0.6 }]}
    >
      <Text style={styles.emoji}>{item.emoji}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={[
            styles.rowTitle,
            item.status === "skipped" && styles.struck,
            item.status === "paid" && { color: Colors.success },
          ]}
        >
          {item.title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.rowMeta}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <View style={[styles.pill, { backgroundColor: colors.bg }]}>
            <Text style={[styles.pillText, { color: colors.fg }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
          {item.kind === "obligation" ? (
            <>
              <Pressable
                disabled={busy}
                onPress={() => onStatus(done ? "pending" : "paid")}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.action,
                    !done && { color: Colors.success, fontWeight: "700" },
                  ]}
                >
                  {done ? "Undo" : "Mark paid"}
                </Text>
              </Pressable>
              {!done ? (
                <Pressable
                  disabled={busy}
                  onPress={() => onStatus("skipped")}
                  accessibilityRole="button"
                  accessibilityHint="Skip this time only"
                  hitSlop={8}
                >
                  <Text style={[styles.action, { color: Colors.textMuted }]}>
                    Skip
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onEdit}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.title}`}
                hitSlop={8}
              >
                <AppIcon name="pencil" size={14} color={Colors.primaryText} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() =>
                router.push(
                  (item.kind === "card"
                    ? "/(tabs)/tracker"
                    : "/policies") as Href,
                )
              }
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text style={styles.action}>
                {item.kind === "card"
                  ? "See bill amount in Tracker"
                  : "View policy"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text
        style={[
          styles.amount,
          item.status === "paid" && { color: Colors.success },
          item.status === "overdue" && { color: Colors.error },
        ]}
      >
        {item.amount != null ? amountText(item.amount) : "—"}
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  addBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: Colors.onPrimary },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.card,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 12,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { fontSize: 24, fontWeight: "700", color: Colors.primaryText },
  monthTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  linkSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primaryText,
    textDecorationLine: "underline",
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, fontWeight: "500", color: Colors.error },
  muted: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  summary: {
    borderRadius: 16,
    backgroundColor: Colors.primary,
    padding: 16,
    marginBottom: 12,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: { fontSize: 12, color: Colors.onPrimary, opacity: 0.75 },
  summaryAmount: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
  eyeBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  eyeText: { fontSize: 11, fontWeight: "600", color: Colors.onPrimary },
  track: {
    marginTop: 12,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  fill: { height: 6, borderRadius: 999, backgroundColor: "#90EE90" },
  summaryFoot: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  calendar: { padding: 10, marginBottom: 12 },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, padding: 2 },
  dayBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  dayToday: { borderColor: Colors.primary },
  daySelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dayText: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  dots: { flexDirection: "row", gap: 2, height: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  undated: {
    borderRadius: 16,
    backgroundColor: Colors.warningLight,
    padding: 14,
    marginBottom: 12,
  },
  undatedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.warningText,
    marginBottom: 4,
  },
  undatedBody: { fontSize: 12, color: Colors.warningText, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  undatedChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.card,
    justifyContent: "center",
  },
  undatedChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.warningText,
  },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  listTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  group: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.card,
    overflow: "hidden",
    marginBottom: 12,
  },
  groupHead: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  emoji: { fontSize: 20 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  struck: { color: Colors.textMuted, textDecorationLine: "line-through" },
  rowMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 10, fontWeight: "700" },
  action: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primaryText,
    textDecorationLine: "underline",
  },
  amount: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  footNote: { textAlign: "center", marginTop: 8, marginBottom: 12 },
}));
