import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import {
  AddObligationForm,
  type ObligationFormPayload,
} from "@/components/tracker/AddObligationForm";
import { CollapsiblePanel } from "@/components/tracker/CollapsiblePanel";
import { PlannedInvestmentsSection } from "@/components/tracker/PlannedInvestmentsSection";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors, themedStyles, tintBg } from "@/constants/theme";
import { deactivateAllCreditCardObligations } from "@/lib/trackerCreditCards";
import { useObligationStore } from "@/store/obligationStore";

const CATEGORY_ICON: Record<string, string> = {
  insurance_life: "🛡️",
  insurance_health: "🏥",
  insurance_vehicle: "🚗",
  insurance_rd: "🗓️",
  loan_emi: "🏦",
  investment_sip: "📈",
  investment_ppf: "💰",
  investment_fd: "🏛️",
  credit_card: "💳",
  subscription: "📱",
  rent: "🏠",
  tax: "📋",
  other: "📌",
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

type Learned = { title: string; category: string; amount: number };
type Editing = { id: string; payload: ObligationFormPayload };

/** This month's obligations — port of web ObligationsChecklist. */
export function ObligationsChecklist({
  userId,
  checklistMonth,
  learnedSuggestion,
  onDismissLearn,
  analyseCompleted = false,
  defaultOpen = false,
}: {
  userId: string;
  /** Anchor month for the checklist (tracker selected month). */
  checklistMonth?: Date;
  learnedSuggestion?: Learned | null;
  onDismissLearn?: () => void;
  /** True when health check already submitted — hides the "set up calendar" empty CTA. */
  analyseCompleted?: boolean;
  defaultOpen?: boolean;
}) {
  const {
    checklist,
    obligations,
    totalObligated,
    totalPaid,
    totalPending,
    generateChecklist,
    markSkipped,
    markUnpaid,
    addObligation,
    updateObligation,
    closeObligation,
    resetAllObligations,
    loading,
  } = useObligationStore();

  const [open, setOpen] = useState(defaultOpen);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const month = checklistMonth ?? new Date();
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  const cleanedCc = useRef(false);
  useEffect(() => {
    const m = checklistMonth ?? new Date();
    void (async () => {
      if (!cleanedCc.current) {
        cleanedCc.current = true;
        await deactivateAllCreditCardObligations(userId);
      }
      await generateChecklist(userId, m);
      await useObligationStore.getState().fetchObligations(userId);
      await useObligationStore.getState().fetchChecklist(userId, m);
    })();
    // monthKey (not the Date identity) decides when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, generateChecklist, monthKey]);

  const handleSave = async (data: ObligationFormPayload) => {
    const id = await addObligation({ ...data, user_id: userId });
    if (!id) throw new Error("addObligation failed");
    await generateChecklist(userId, month);
    await useObligationStore.getState().fetchObligations(userId);
    setShowAdd(false);
  };

  const handleUpdate = async (data: ObligationFormPayload) => {
    if (!editing) return;
    const ok = await updateObligation(editing.id, {
      title: data.title,
      category: data.category,
      amount: data.amount,
      frequency: data.frequency,
      due_day: data.due_day,
      due_month: data.due_month,
      source: "manual",
    });
    if (!ok) throw new Error("updateObligation failed");
    await generateChecklist(userId, month);
    await useObligationStore.getState().fetchObligations(userId);
    await useObligationStore.getState().fetchChecklist(userId, month);
    setEditing(null);
  };

  const acceptLearned = async () => {
    if (!learnedSuggestion) return;
    await addObligation({
      title: learnedSuggestion.title,
      category: learnedSuggestion.category,
      amount: learnedSuggestion.amount,
      frequency: "monthly",
      source: "tracker_learned",
      user_id: userId,
      is_active: true,
      remind_days_before: 7,
    });
    await generateChecklist(userId, month);
    await useObligationStore.getState().fetchObligations(userId);
    onDismissLearn?.();
  };

  const confirmClose = (obId: string, title: string) => {
    Alert.alert(
      `Mark “${title}” as closed?`,
      "It stays on this month’s list (struck out).\nIt will not appear from next month.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark closed",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await closeObligation(obId, month);
              await useObligationStore.getState().fetchChecklist(userId, month);
            })();
          },
        },
      ],
    );
  };

  const hasObligationData = checklist.length > 0 || obligations.length > 0;
  const showSetupEmpty = !hasObligationData && !analyseCompleted;
  const subtitle = hasObligationData
    ? `${inr(totalPending)} pending · ${inr(totalPaid)} paid`
    : "Add EMIs, SIPs, renewals";
  const paidPct =
    totalObligated > 0 ? Math.min(100, (totalPaid / totalObligated) * 100) : 0;

  return (
    <>
      {learnedSuggestion && learnedSuggestion.category !== "credit_card" ? (
        <View style={styles.learned}>
          <AppIcon name="bulb" size={20} color={Colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.learnedTitle}>Add to your obligations?</Text>
            <Text style={styles.learnedBody}>
              Looks like &quot;{learnedSuggestion.title}&quot; (
              {inr(learnedSuggestion.amount)}) is a recurring payment. Add it so
              we can remind you!
            </Text>
            <View style={styles.learnedActions}>
              <Pressable
                onPress={() => void acceptLearned()}
                accessibilityRole="button"
                style={styles.learnedYes}
              >
                <Text style={styles.learnedYesText}>Yes, add it</Text>
              </Pressable>
              <Pressable
                onPress={() => onDismissLearn?.()}
                accessibilityRole="button"
                style={styles.learnedNo}
              >
                <Text style={styles.learnedNoText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <CollapsiblePanel
        title="This month’s obligations"
        subtitle={subtitle}
        icon="calendar"
        open={open}
        onToggle={() => setOpen((v) => !v)}
        defaultBorder={false}
        headerRight={
          hasObligationData ? (
            <Pressable
              onPress={() => setConfirmReset(true)}
              accessibilityRole="button"
              accessibilityLabel="Reset all obligations"
              hitSlop={8}
              style={styles.headerTrash}
            >
              <AppIcon name="trash" size={16} color={Colors.error} />
            </Pressable>
          ) : null
        }
      >
        {showSetupEmpty ? (
          <View style={styles.setup}>
            <AppIcon name="bulb" size={22} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.setupTitle}>
                Set up your financial calendar
              </Text>
              <Text style={styles.setupBody}>
                Add EMI dates, insurance renewals and SIPs. Finkoin reminds you
                before each one. Recurring expenses can also be added
                automatically when we spot a monthly pattern.
              </Text>
              <Pressable
                onPress={() => setShowAdd(true)}
                accessibilityRole="button"
                style={styles.setupBtn}
              >
                <Text style={styles.setupBtnText}>Add first obligation</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.list}>
            <View style={styles.strip}>
              <View style={styles.stripTop}>
                <Text style={styles.stripLabel}>Keep this aside</Text>
                <Text style={styles.stripTotal}>{inr(totalObligated)}</Text>
              </View>
              <View style={styles.stripTrack}>
                <View style={[styles.stripFill, { width: `${paidPct}%` }]} />
              </View>
              <View style={styles.stripFoot}>
                <Text style={styles.stripFootText}>
                  ✓ Paid: {inr(totalPaid)}
                </Text>
                <Text style={styles.stripFootText}>
                  Pending: {inr(totalPending)}
                </Text>
              </View>
            </View>

            {checklist.length > 0 ? (
              checklist.map((item, i) => {
                const ob = item.obligation;
                const isClosed = ob != null && ob.is_active === false;
                const isPaid =
                  item.status === "paid" || item.status === "auto_debit";
                const isSkipped = item.status === "skipped";
                const shownAmount =
                  (ob?.amount != null && ob.amount > 0
                    ? ob.amount
                    : item.expected_amount) || 0;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      i < checklist.length - 1 && styles.rowDivider,
                      isClosed
                        ? styles.rowClosed
                        : isPaid
                          ? styles.rowPaid
                          : isSkipped
                            ? styles.rowSkipped
                            : null,
                    ]}
                  >
                    <View style={styles.rowMain}>
                      <View
                        accessibilityLabel={
                          isClosed
                            ? "Closed — will not appear from next month"
                            : isPaid
                              ? "Paid via logged expense"
                              : "Checks automatically when you log the expense"
                        }
                        style={[
                          styles.dot,
                          isClosed
                            ? styles.dotClosed
                            : isPaid
                              ? styles.dotPaid
                              : isSkipped
                                ? styles.dotSkipped
                                : null,
                        ]}
                      >
                        {isPaid && !isClosed ? (
                          <AppIcon
                            name="check"
                            size={14}
                            color={Colors.onPrimary}
                          />
                        ) : isClosed ? (
                          <Text style={styles.dotDash}>—</Text>
                        ) : null}
                      </View>
                      <Text style={styles.emoji}>
                        {CATEGORY_ICON[ob?.category || "other"] || "📌"}
                      </Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[
                            styles.rowTitle,
                            isClosed
                              ? styles.struckMuted
                              : isPaid
                                ? { color: Colors.successText }
                                : null,
                            isSkipped && !isClosed && styles.struck,
                          ]}
                          numberOfLines={1}
                        >
                          {ob?.title || "Obligation"}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {isClosed
                            ? "Closed · won’t show from next month"
                            : `${
                                ob?.frequency === "monthly"
                                  ? `Due on ${ob.due_day ?? "—"}th`
                                  : ob?.frequency === "yearly"
                                    ? `Due in ${MONTH_SHORT[(ob.due_month || 1) - 1]}`
                                    : (ob?.frequency ?? "")
                              }${
                                isPaid && item.paid_at
                                  ? ` · Paid ${new Date(
                                      item.paid_at,
                                    ).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                    })}`
                                  : ""
                              }${isSkipped ? " · Skipped" : ""}`}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.rowAmount,
                          isClosed
                            ? styles.struckMuted
                            : isPaid
                              ? { color: Colors.success }
                              : null,
                        ]}
                      >
                        {inr(shownAmount)}
                      </Text>
                    </View>

                    {isClosed ? (
                      <Text style={styles.closedTag}>Closed</Text>
                    ) : (
                      <View style={styles.actions}>
                        {ob ? (
                          <Pressable
                            onPress={() => {
                              setShowAdd(false);
                              setEditing({
                                id: ob.id,
                                payload: {
                                  title: ob.title,
                                  category: ob.category,
                                  amount: ob.amount,
                                  frequency: ob.frequency,
                                  due_day: ob.due_day ?? null,
                                  due_month: ob.due_month ?? null,
                                  source: ob.source,
                                  is_active: true,
                                  remind_days_before: ob.remind_days_before,
                                },
                              });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${ob.title}`}
                            hitSlop={6}
                            style={styles.actionBtn}
                          >
                            <AppIcon
                              name="pencil"
                              size={14}
                              color={Colors.primary}
                            />
                            <Text style={styles.actionEdit}>Edit</Text>
                          </Pressable>
                        ) : null}
                        {isSkipped ? (
                          <Pressable
                            onPress={() => void markUnpaid(item.id)}
                            accessibilityRole="button"
                            hitSlop={6}
                            style={styles.actionBtn}
                          >
                            <Text style={styles.actionRestore}>Restore</Text>
                          </Pressable>
                        ) : null}
                        {!isPaid && !isSkipped ? (
                          <Pressable
                            onPress={() => void markSkipped(item.id)}
                            accessibilityRole="button"
                            accessibilityHint="Skip this month only — comes back next month"
                            hitSlop={6}
                            style={styles.actionBtn}
                          >
                            <Text style={styles.actionSkip}>Skip</Text>
                          </Pressable>
                        ) : null}
                        {ob ? (
                          <Pressable
                            onPress={() => confirmClose(ob.id, ob.title)}
                            accessibilityRole="button"
                            accessibilityLabel={`Mark ${ob.title} as closed`}
                            hitSlop={6}
                            style={[styles.actionBtn, styles.closeBtn]}
                          >
                            <AppIcon
                              name="trash"
                              size={12}
                              color={Colors.error}
                            />
                            <Text style={styles.closeText}>Mark closed</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyRow}>
                {obligations.length > 0
                  ? `${obligations.length} obligation${obligations.length === 1 ? "" : "s"} saved — none due on this month’s checklist yet.`
                  : "No obligations due this month yet."}
              </Text>
            )}

            <View style={styles.footer}>
              <Pressable
                onPress={() => setShowAdd(true)}
                accessibilityRole="button"
                style={styles.addBtn}
              >
                <Text style={styles.addText}>+ Add obligation</Text>
              </Pressable>
              <Text style={styles.footerHint}>
                {loading
                  ? "Updating…"
                  : "Mark closed = strike this month · hide from next"}
              </Text>
            </View>
          </View>
        )}
        <PlannedInvestmentsSection userId={userId} />
      </CollapsiblePanel>

      <BottomSheet
        visible={confirmReset}
        onClose={() => setConfirmReset(false)}
      >
        <Text style={styles.resetTitle}>Reset all obligations?</Text>
        <Text style={styles.resetBody}>
          This permanently deletes every obligation and this month’s checklist
          from the database. You can add them again later.
        </Text>
        <View style={styles.resetActions}>
          <Pressable
            onPress={() => setConfirmReset(false)}
            accessibilityRole="button"
            style={styles.resetCancel}
          >
            <Text style={styles.resetCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setResetting(true);
              void (async () => {
                await resetAllObligations(userId);
                setResetting(false);
                setConfirmReset(false);
              })();
            }}
            disabled={resetting}
            accessibilityRole="button"
            style={[styles.resetConfirm, resetting && { opacity: 0.6 }]}
          >
            <Text style={styles.resetConfirmText}>
              {resetting ? "Deleting…" : "Delete all"}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showAdd || editing != null}
        onClose={() => {
          setShowAdd(false);
          setEditing(null);
        }}
        scroll
      >
        <AddObligationForm
          key={editing ? `edit-${editing.id}` : "add-new"}
          initial={editing?.payload}
          onSave={editing ? handleUpdate : handleSave}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      </BottomSheet>
    </>
  );
}

const styles = themedStyles(() => ({
  learned: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    padding: 14,
    marginBottom: 8,
  },
  learnedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 2,
  },
  learnedBody: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 8,
    lineHeight: 17,
  },
  learnedActions: { flexDirection: "row", gap: 8 },
  learnedYes: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  learnedYesText: { fontSize: 13, fontWeight: "700", color: Colors.onPrimary },
  learnedNo: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  learnedNoText: { fontSize: 13, color: Colors.primary },
  headerTrash: { padding: 6 },
  setup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    padding: 12,
  },
  setupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  setupBody: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.primary,
    marginBottom: 10,
  },
  setupBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
  },
  setupBtnText: { fontSize: 13, fontWeight: "700", color: Colors.onPrimary },
  list: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  strip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stripTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  stripLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  stripTotal: { fontSize: 18, fontWeight: "800", color: Colors.onPrimary },
  stripTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  stripFill: { height: "100%", borderRadius: 999, backgroundColor: "#90EE90" },
  stripFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  stripFootText: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.card,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.background },
  rowClosed: { backgroundColor: Colors.background, opacity: 0.7 },
  rowPaid: { backgroundColor: tintBg("#F7FDF9") },
  rowSkipped: { backgroundColor: Colors.background, opacity: 0.6 },
  rowMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dotClosed: { borderColor: "#D3D1C7", backgroundColor: Colors.border },
  dotPaid: { borderColor: Colors.success, backgroundColor: Colors.success },
  dotSkipped: { borderColor: Colors.border },
  dotDash: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  emoji: { fontSize: 18 },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  struck: { textDecorationLine: "line-through" },
  struckMuted: { color: Colors.textMuted, textDecorationLine: "line-through" },
  rowMeta: { fontSize: 11, color: Colors.textMuted },
  rowAmount: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  closedTag: {
    alignSelf: "flex-end",
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionEdit: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  actionRestore: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  actionSkip: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
  closeBtn: { backgroundColor: Colors.errorLight },
  closeText: { fontSize: 12, fontWeight: "700", color: Colors.error },
  emptyRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  addBtn: { minHeight: 44, justifyContent: "center" },
  addText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  footerHint: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    color: Colors.textMuted,
  },
  resetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  resetBody: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  resetActions: { flexDirection: "row", gap: 8 },
  resetCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  resetCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  resetConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  resetConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
}));
