/**
 * Add / edit expense — PWA `/split/[groupId]/add-expense` parity.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore, type SplitGroupMember } from "@/store/splitStore";
import { computeSplitShares } from "@/lib/splitShares";
import { formatIndian } from "@/lib/formatters";
import { localISODate, msUntilNextLocalMidnight } from "@/lib/localDate";
import { useKeyboardSheet } from "@/lib/useKeyboardSheet";
import type { TrackerIconName } from "@/lib/tracker-categories";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import { DateField } from "@/components/tracker/DateField";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors, themedStyles, tintBg, tintFg, brand } from "@/constants/theme";

type SplitType = "equal" | "exact" | "percentage" | "shares";
type FieldKey =
  | "amount"
  | "title"
  | "paidBy"
  | "members"
  | "exact"
  | "percentage"
  | "shares"
  | "form";

const FIELD_ORDER: FieldKey[] = [
  "amount",
  "title",
  "paidBy",
  "members",
  "exact",
  "percentage",
  "shares",
  "form",
];

const ERROR_RED = "#E24B4A";
const ERROR_BG = () => tintBg("#FDEDED");
const ERROR_TEXT = () => tintFg("#991B1B");
const ERROR_BORDER = () => tintBg("#F5D0D0");

const CATEGORY_OPTIONS: {
  key: string;
  label: string;
  icon: TrackerIconName;
}[] = [
  { key: "food", label: "Food", icon: "utensils" },
  { key: "transport", label: "Transport", icon: "cab" },
  { key: "accommodation", label: "Hotel", icon: "building" },
  { key: "entertainment", label: "Entertainment", icon: "party" },
  { key: "shopping", label: "Shopping", icon: "cart" },
  { key: "utilities", label: "Utilities", icon: "bolt" },
  { key: "medical", label: "Medical", icon: "pill" },
  { key: "other", label: "Other", icon: "package" },
];

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percentage", label: "Percent" },
  { value: "shares", label: "Shares" },
];

const MONEY_RE = /^\d*\.?\d{0,2}$/;

function formatShare(n: number) {
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function draftNumber(v: string | undefined) {
  return !v || v === "." ? 0 : Number(v) || 0;
}

export default function AddExpenseScreen() {
  const params = useLocalSearchParams<{ groupId: string; edit?: string }>();
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : (params.groupId ?? "");
  const rawEdit = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const editExpenseId = rawEdit ? rawEdit : null;
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const createdBy = user?.id ?? "";

  const activeGroup = useSplitStore((s) => s.activeGroup);
  const expenses = useSplitStore((s) => s.expenses);
  const fetchGroupDetail = useSplitStore((s) => s.fetchGroupDetail);
  const addExpense = useSplitStore((s) => s.addExpense);
  const editExpense = useSplitStore((s) => s.editExpense);
  const storeLoading = useSplitStore((s) => s.loading);
  const [detailReady, setDetailReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const hydratedEdit = useRef<string | null>(null);

  const groupLoaded = detailReady && activeGroup?.id === groupId;
  const groupMembers = activeGroup?.members;
  const splittableMembers = useMemo(
    () =>
      ((groupLoaded ? (groupMembers ?? []) : []) as SplitGroupMember[]).filter(
        (m) => m.status?.toLowerCase() === "active",
      ),
    [groupLoaded, groupMembers],
  );
  const memberKey = splittableMembers
    .map((m) => m.email.toLowerCase())
    .sort()
    .join("|");

  const [amountRaw, setAmountRaw] = useState<number>(0);
  const [amountText, setAmountText] = useState("");
  const [title, setTitle] = useState("");
  const [paidByEmail, setPaidByEmail] = useState("");
  const [payerOpen, setPayerOpen] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [category, setCategory] = useState<string>("food");
  const [expenseDate, setExpenseDate] = useState(() => localISODate());
  const [today, setToday] = useState(() => localISODate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});

  const [includedEmails, setIncludedEmails] = useState<Record<string, boolean>>(
    {},
  );
  const [exactMap, setExactMap] = useState<Record<string, string>>({});
  const [pctMap, setPctMap] = useState<Record<string, string>>({});
  const [shareCounts, setShareCounts] = useState<Record<string, string>>({});

  const { keyboardHeight, scrollRef, onScroll, onFocusWithin } =
    useKeyboardSheet();
  const cardY = useRef(0);
  const fieldY = useRef<Partial<Record<FieldKey, number>>>({});
  const trackField = (key: FieldKey) => (e: LayoutChangeEvent) => {
    fieldY.current[key] = e.nativeEvent.layout.y;
  };

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const scrollToField = useCallback(
    (key: FieldKey) => {
      // Wait a frame so newly rendered error text is laid out first.
      setTimeout(() => {
        const y = fieldY.current[key];
        if (y == null) return;
        scrollRef.current?.scrollTo({
          y: Math.max(0, cardY.current + y - 80),
          animated: true,
        });
      }, 60);
    },
    [scrollRef],
  );

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setDetailReady(false);
    setLoadError("");
    hydratedEdit.current = null;
    void fetchGroupDetail(groupId)
      .then(() => {
        const loaded = useSplitStore.getState().activeGroup;
        if (!cancelled && (!loaded || loaded.id !== groupId)) {
          setLoadError("Could not load this group. Go back and try again.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Could not load this group. Go back and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchGroupDetail, groupId]);

  // Keep expense date on the device's local calendar day (not UTC).
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    const syncToday = () => {
      const next = localISODate();
      setToday((prevToday) => {
        if (!editExpenseId) {
          setExpenseDate((prevDate) =>
            !prevDate || prevDate === prevToday ? next : prevDate,
          );
        }
        return next;
      });
      if (midnightTimer) clearTimeout(midnightTimer);
      midnightTimer = setTimeout(syncToday, msUntilNextLocalMidnight());
    };
    syncToday();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncToday();
    });
    return () => {
      sub.remove();
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [editExpenseId]);

  // Init included members / default payer only when the member set changes.
  useEffect(() => {
    if (!memberKey) return;
    if (editExpenseId && hydratedEdit.current === editExpenseId) return;

    const emails = memberKey.split("|").filter(Boolean);
    const init: Record<string, boolean> = {};
    for (const email of emails) init[email] = true;
    setIncludedEmails(init);

    const me = (user?.email ?? "").toLowerCase();
    setPaidByEmail((prev) => {
      if (prev && emails.includes(prev.toLowerCase()))
        return prev.toLowerCase();
      if (me && emails.includes(me)) return me;
      return emails[0] ?? "";
    });
  }, [memberKey, user?.email, editExpenseId]);

  useEffect(() => {
    if (!editExpenseId || !detailReady) return;
    if (hydratedEdit.current === editExpenseId) return;
    const expense = expenses.find((e) => e.id === editExpenseId);
    if (!expense) return;
    hydratedEdit.current = editExpenseId;
    const amt = Number(expense.amount) || 0;
    setAmountRaw(amt);
    setAmountText(amt > 0 ? String(amt) : "");
    setTitle(expense.title || "");
    setPaidByEmail((expense.paid_by_email || "").toLowerCase());
    setCategory(expense.category || "food");
    setExpenseDate(expense.expense_date || localISODate());
    setNotes(expense.notes || "");
    const st = expense.split_type;
    if (
      st === "equal" ||
      st === "exact" ||
      st === "percentage" ||
      st === "shares"
    ) {
      setSplitType(st);
    }
    const included: Record<string, boolean> = {};
    const exact: Record<string, string> = {};
    const pct: Record<string, string> = {};
    const shares: Record<string, string> = {};
    for (const m of splittableMembers) {
      included[m.email.toLowerCase()] = false;
    }
    for (const s of expense.shares ?? []) {
      const key = s.email.toLowerCase();
      included[key] = true;
      const shareAmt = Number(s.share_amount) || 0;
      exact[key] = shareAmt > 0 ? String(shareAmt) : "";
      pct[key] = String(Number(s.share_percentage) || 0);
      shares[key] = String(
        Math.max(1, Math.round(Number(s.share_percentage) || 1)),
      );
    }
    setIncludedEmails(included);
    setExactMap(exact);
    setPctMap(pct);
    setShareCounts(shares);
  }, [editExpenseId, detailReady, expenses, splittableMembers]);

  const includedMembers = useMemo(() => {
    return splittableMembers
      .filter((m) => includedEmails[m.email.toLowerCase()])
      .map((m) => ({
        email: m.email,
        display_name: m.display_name,
        user_id: m.user_id,
      }));
  }, [includedEmails, splittableMembers]);

  const exactAmountsNumeric = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(exactMap)) out[k] = draftNumber(v);
    return out;
  }, [exactMap]);

  const pctNumeric = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(pctMap)) out[k] = draftNumber(v);
    return out;
  }, [pctMap]);

  const shareCountNums = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of includedMembers) {
      const key = m.email.toLowerCase();
      out[key] = parseFloat(shareCounts[key] || "1") || 1;
    }
    return out;
  }, [includedMembers, shareCounts]);

  /** Live share preview — same engine as the API (esp. equal). */
  const previewShares = useMemo(() => {
    if (!amountRaw || amountRaw <= 0 || includedMembers.length === 0) {
      return null;
    }
    return computeSplitShares({
      amount: amountRaw,
      splitType,
      includedMembers,
      exactAmounts: splitType === "exact" ? exactAmountsNumeric : undefined,
      percentages: splitType === "percentage" ? pctNumeric : undefined,
      shareCounts: splitType === "shares" ? shareCountNums : undefined,
    });
  }, [
    amountRaw,
    exactAmountsNumeric,
    includedMembers,
    pctNumeric,
    shareCountNums,
    splitType,
  ]);

  const paidBy = useMemo(() => {
    const e = paidByEmail.toLowerCase();
    return splittableMembers.find((m) => m.email.toLowerCase() === e) ?? null;
  }, [splittableMembers, paidByEmail]);

  const exactSum = useMemo(
    () =>
      includedMembers.reduce(
        (s, m) => s + Number(exactAmountsNumeric[m.email.toLowerCase()] ?? 0),
        0,
      ),
    [exactAmountsNumeric, includedMembers],
  );

  const pctSum = useMemo(
    () =>
      includedMembers.reduce(
        (s, m) => s + Number(pctNumeric[m.email.toLowerCase()] ?? 0),
        0,
      ),
    [includedMembers, pctNumeric],
  );

  const toggleIncluded = (email: string) => {
    const key = email.toLowerCase();
    setIncludedEmails((prev) => {
      const nextOn = !prev[key];
      // Keep at least one person in the split.
      if (!nextOn) {
        const othersOn = Object.entries(prev).some(
          ([k, on]) => k !== key && on,
        );
        if (!othersOn) return prev;
      }
      return { ...prev, [key]: nextOn };
    });
  };

  const goToGroupExpenses = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (!groupId) {
      router.replace("/split");
      return;
    }
    router.replace({ pathname: "/split/[groupId]", params: { groupId } });
  };

  const handleSubmit = async () => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    if (!groupId) return;
    if (!isLoggedIn || !createdBy) {
      nextErrors.form = "Sign in again to add expenses.";
    }
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      nextErrors.amount = "Enter a valid amount.";
    }
    if (!title.trim()) {
      nextErrors.title = "Enter a description.";
    }
    if (!paidByEmail) {
      nextErrors.paidBy = "Choose who paid.";
    }
    if (includedMembers.length === 0) {
      nextErrors.members = "Select at least one member to split with.";
    }
    if (splitType === "exact" && !nextErrors.amount) {
      const diff = Math.abs(exactSum - Number(amountRaw || 0));
      if (diff > 0.01) {
        nextErrors.exact = `Must total ₹${formatIndian(amountRaw)} (now ₹${formatIndian(exactSum)}).`;
      }
    }
    if (splitType === "percentage") {
      if (Math.abs(pctSum - 100) > 0.01) {
        nextErrors.percentage = `Must add to 100% (now ${pctSum}%).`;
      }
    }
    if (splitType === "shares") {
      const totalShares = includedMembers.reduce(
        (s, m) =>
          s + (parseFloat(shareCounts[m.email.toLowerCase()] || "1") || 0),
        0,
      );
      if (totalShares <= 0) {
        nextErrors.shares =
          "Enter a positive share count for at least one member.";
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = FIELD_ORDER.find((k) => nextErrors[k]);
      if (firstKey) scrollToField(firstKey);
      return;
    }

    setBusy(true);
    try {
      const paidByName =
        paidBy?.display_name ?? paidByEmail.split("@")[0] ?? "Member";
      const common = {
        groupId,
        title: title.trim(),
        amount: amountRaw,
        category,
        paidByEmail: paidByEmail.toLowerCase(),
        paidByName,
        paidByUserId: paidBy?.user_id ?? null,
        splitType,
        expenseDate,
        includedMembers,
        exactAmounts: splitType === "exact" ? exactAmountsNumeric : undefined,
        percentages: splitType === "percentage" ? pctNumeric : undefined,
        shareCounts: splitType === "shares" ? shareCountNums : undefined,
      };
      const trimmedNotes = notes.trim();

      const res = editExpenseId
        ? await editExpense({
            ...common,
            expenseId: editExpenseId,
            notes: trimmedNotes ? trimmedNotes : null,
          })
        : await addExpense({
            ...common,
            notes: trimmedNotes ? trimmedNotes : undefined,
            createdBy,
          });

      if (res.error) {
        setFieldErrors({ form: res.error });
        scrollToField("form");
        return;
      }
      goToGroupExpenses();
    } catch (err: unknown) {
      setFieldErrors({
        form: err instanceof Error ? err.message : "Could not save. Try again.",
      });
      scrollToField("form");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy &&
    groupLoaded &&
    Boolean(groupId) &&
    isLoggedIn &&
    splittableMembers.length > 0 &&
    includedMembers.length > 0;

  const amountFontSize = Math.max(
    28,
    52 - Math.max(0, amountText.length - 7) * 4,
  );

  const payerLabel = paidBy
    ? `${paidBy.display_name} (${paidBy.email.toLowerCase()})`
    : paidByEmail || "Choose who paid";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom:
            keyboardHeight > 0 ? keyboardHeight + 24 : insets.bottom + 48,
        }}
      >
        <View style={styles.page} onFocus={onFocusWithin}>
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <Pressable
                onPress={goToGroupExpenses}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
                style={styles.backBtn}
              >
                <View style={styles.backCircle}>
                  <Text style={styles.backArrow}>←</Text>
                </View>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
              <Text style={styles.headerEyebrow}>
                {editExpenseId ? "Edit expense" : "Add expense"}
              </Text>
            </View>
            <Text style={styles.headerTitle}>
              {editExpenseId ? "Update expense" : "New expense"}
            </Text>
            <Text style={styles.headerSub}>Split among selected members.</Text>
          </View>

          <View
            style={styles.card}
            onLayout={(e) => {
              cardY.current = e.nativeEvent.layout.y;
            }}
          >
            {!groupLoaded || storeLoading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loaderText}>Loading…</Text>
              </View>
            ) : null}
            {loadError ? (
              <Text style={styles.alertBox}>{loadError}</Text>
            ) : null}
            {groupLoaded && !loadError && splittableMembers.length === 0 ? (
              <Text style={styles.alertBox}>
                No members found for this group. Invite someone from the group
                page, then try again.
              </Text>
            ) : null}

            <View
              onLayout={trackField("amount")}
              style={[
                styles.amountBox,
                fieldErrors.amount ? styles.amountBoxError : null,
              ]}
            >
              <Text style={styles.amountLabel}>TOTAL AMOUNT</Text>
              <View style={styles.amountRow}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  value={amountText}
                  onChangeText={(text) => {
                    clearFieldError("amount");
                    const v = text.replace(/,/g, "");
                    if (v !== "" && !MONEY_RE.test(v)) return;
                    setAmountText(v);
                    setAmountRaw(draftNumber(v));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={brand("#AFA9EC")}
                  autoFocus={!editExpenseId}
                  accessibilityLabel="Total amount"
                  style={[
                    styles.amountInput,
                    {
                      fontSize: amountFontSize,
                      lineHeight: amountFontSize + 8,
                    },
                  ]}
                />
              </View>
              {fieldErrors.amount ? (
                <Text style={[styles.errorText, styles.center]}>
                  {fieldErrors.amount}
                </Text>
              ) : null}
              {previewShares?.shares?.length && !previewShares.error ? (
                <View style={styles.preview}>
                  {splitType === "equal" ? (
                    <Text style={styles.previewHead}>
                      {`Equal split · ${includedMembers.length} people · sums to ₹${formatIndian(amountRaw)}`}
                    </Text>
                  ) : null}
                  {previewShares.shares.map((s) => (
                    <View key={s.email} style={styles.previewRow}>
                      <Text style={styles.previewName} numberOfLines={1}>
                        {s.display_name}
                      </Text>
                      <Text style={styles.previewAmt}>
                        {formatShare(s.share_amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : previewShares?.error ? (
                <Text style={[styles.errorText, styles.center]}>
                  {previewShares.error}
                </Text>
              ) : null}
            </View>

            <View onLayout={trackField("title")} style={styles.mt8}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={title}
                onChangeText={(v) => {
                  clearFieldError("title");
                  setTitle(v);
                }}
                placeholder="Beach shack drinks"
                placeholderTextColor={Colors.textMuted}
                style={[styles.input, fieldErrors.title && styles.inputError]}
              />
              {fieldErrors.title ? (
                <Text style={styles.errorText}>{fieldErrors.title}</Text>
              ) : null}
            </View>

            <View onLayout={trackField("paidBy")} style={styles.mt16}>
              <Text style={styles.label}>Paid by</Text>
              <Pressable
                onPress={() => setPayerOpen((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={`Paid by: ${payerLabel}`}
                style={[
                  styles.input,
                  styles.select,
                  payerOpen && styles.inputFocused,
                  fieldErrors.paidBy && styles.inputError,
                ]}
              >
                <Text style={styles.selectText} numberOfLines={1}>
                  {payerLabel}
                </Text>
                <AppIcon
                  name="chevronDown"
                  size={18}
                  color={Colors.textSecondary}
                />
              </Pressable>
              {payerOpen ? (
                <View style={styles.optionList}>
                  {splittableMembers.map((m) => {
                    const email = m.email.toLowerCase();
                    const on = email === paidByEmail.toLowerCase();
                    return (
                      <Pressable
                        key={email}
                        onPress={() => {
                          clearFieldError("paidBy");
                          setPaidByEmail(email);
                          setPayerOpen(false);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.option, on && styles.optionOn]}
                      >
                        <Text
                          style={[styles.optionText, on && styles.optionTextOn]}
                          numberOfLines={1}
                        >
                          {m.display_name} ({email})
                        </Text>
                        {on ? (
                          <AppIcon
                            name="check"
                            size={16}
                            color={Colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {fieldErrors.paidBy ? (
                <Text style={styles.errorText}>{fieldErrors.paidBy}</Text>
              ) : null}
            </View>

            <View style={styles.mt16}>
              <Text style={styles.label}>Split type</Text>
              <View style={styles.grid2}>
                {SPLIT_TYPES.map((t) => {
                  const on = splitType === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setSplitType(t.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.gridBtn, on && styles.gridBtnOn]}
                    >
                      <Text
                        style={[styles.gridBtnText, on && styles.gridBtnTextOn]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              onLayout={trackField("members")}
              style={[
                styles.membersWrap,
                fieldErrors.members ? styles.membersWrapError : null,
              ]}
            >
              <Text style={styles.label}>Split among</Text>
              <View style={styles.chips}>
                {splittableMembers.map((m) => {
                  const on = Boolean(includedEmails[m.email.toLowerCase()]);
                  return (
                    <Pressable
                      key={m.email}
                      onPress={() => {
                        clearFieldError("members");
                        toggleIncluded(m.email);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {m.display_name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.members ? (
                <Text style={styles.errorText}>{fieldErrors.members}</Text>
              ) : (
                <Text style={styles.hint}>
                  {includedMembers.length} selected
                </Text>
              )}
            </View>

            {splitType === "exact" ? (
              <View
                onLayout={trackField("exact")}
                style={[
                  styles.subCard,
                  fieldErrors.exact ? styles.subCardError : null,
                ]}
              >
                <Text style={styles.subTitle}>EXACT AMOUNTS</Text>
                <View style={styles.rows}>
                  {includedMembers.map((m) => {
                    const key = m.email.toLowerCase();
                    return (
                      <View key={m.email} style={styles.row}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {m.display_name}
                        </Text>
                        <TextInput
                          value={exactMap[key] ?? ""}
                          onChangeText={(text) => {
                            clearFieldError("exact");
                            const v = text.replace(/,/g, "");
                            if (v !== "" && !MONEY_RE.test(v)) return;
                            setExactMap((prev) => ({ ...prev, [key]: v }));
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={Colors.textMuted}
                          style={[
                            styles.rowInput,
                            { width: 140 },
                            fieldErrors.exact && styles.inputError,
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
                {fieldErrors.exact ? (
                  <Text style={[styles.errorText, styles.mt12]}>
                    {fieldErrors.exact}
                  </Text>
                ) : (
                  <Text style={styles.total}>
                    Total: ₹{formatIndian(exactSum)} / ₹
                    {formatIndian(amountRaw || 0)}
                  </Text>
                )}
              </View>
            ) : null}

            {splitType === "shares" ? (
              <View
                onLayout={trackField("shares")}
                style={[
                  styles.subCard,
                  fieldErrors.shares ? styles.subCardError : null,
                ]}
              >
                <Text style={styles.subTitle}>SHARE COUNTS</Text>
                <Text style={styles.subHint}>
                  Enter number of shares per person. Amount is divided
                  proportionally.
                </Text>
                <View style={styles.rows}>
                  {includedMembers.map((m) => {
                    const key = m.email.toLowerCase();
                    return (
                      <View key={m.email} style={styles.row}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {m.display_name}
                        </Text>
                        <TextInput
                          value={shareCounts[key] ?? "1"}
                          onChangeText={(v) => {
                            clearFieldError("shares");
                            setShareCounts((prev) => ({ ...prev, [key]: v }));
                          }}
                          keyboardType="number-pad"
                          style={[
                            styles.rowInput,
                            { width: 80, color: Colors.primary },
                            fieldErrors.shares && styles.inputError,
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
                {fieldErrors.shares ? (
                  <Text style={[styles.errorText, styles.mt12]}>
                    {fieldErrors.shares}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {splitType === "percentage" ? (
              <View
                onLayout={trackField("percentage")}
                style={[
                  styles.subCard,
                  fieldErrors.percentage ? styles.subCardError : null,
                ]}
              >
                <Text style={styles.subTitle}>PERCENTAGES</Text>
                <View style={styles.rows}>
                  {includedMembers.map((m) => {
                    const key = m.email.toLowerCase();
                    return (
                      <View key={m.email} style={styles.row}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {m.display_name}
                        </Text>
                        <View style={styles.pctWrap}>
                          <TextInput
                            value={pctMap[key] ?? ""}
                            onChangeText={(text) => {
                              clearFieldError("percentage");
                              const v = text.replace(/,/g, "");
                              if (v !== "" && !MONEY_RE.test(v)) return;
                              setPctMap((prev) => ({ ...prev, [key]: v }));
                            }}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                            style={[
                              styles.rowInput,
                              { width: 110 },
                              fieldErrors.percentage && styles.inputError,
                            ]}
                          />
                          <Text style={styles.pctSuffix}>%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                {fieldErrors.percentage ? (
                  <Text style={[styles.errorText, styles.mt12]}>
                    {fieldErrors.percentage}
                  </Text>
                ) : (
                  <Text style={styles.total}>Total: {pctSum}% / 100%</Text>
                )}
              </View>
            ) : null}

            <View style={styles.mt20}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.grid2}>
                {CATEGORY_OPTIONS.map((c) => {
                  const on = category === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => setCategory(c.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[
                        styles.gridBtn,
                        styles.catBtn,
                        on && styles.gridBtnOn,
                      ]}
                    >
                      <TrackerIcon
                        name={c.icon}
                        size={16}
                        color={on ? Colors.primary : Colors.textPrimary}
                      />
                      <Text
                        style={[
                          styles.gridBtnText,
                          styles.catText,
                          on && styles.gridBtnTextOn,
                        ]}
                        numberOfLines={1}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.mt20}>
              <DateField
                label="Date"
                value={expenseDate}
                max={today}
                onChange={setExpenseDate}
              />
            </View>

            <View style={styles.mt12}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a note"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </View>

            {fieldErrors.form ? (
              <Text
                onLayout={trackField("form")}
                style={[styles.alertBox, styles.mt16]}
              >
                {fieldErrors.form}
              </Text>
            ) : null}

            <Pressable
              onPress={() => void handleSubmit()}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy }}
              style={({ pressed }) => [
                styles.submit,
                !canSubmit && styles.submitDisabled,
                pressed && canSubmit && styles.submitPressed,
              ]}
            >
              <Text style={styles.submitText}>
                {busy
                  ? editExpenseId
                    ? "Saving…"
                    : "Adding…"
                  : editExpenseId
                    ? "Save changes"
                    : "Add expense"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { paddingHorizontal: 16, paddingTop: 16 },
  headerCard: {
    borderRadius: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  backBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: Colors.onPrimary, fontSize: 16, fontWeight: "700" },
  backText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  headerTitle: {
    marginTop: 12,
    color: Colors.onPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    marginTop: 2,
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  card: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 20,
  },
  loader: {
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loaderText: { fontSize: 13, color: Colors.textMuted },
  alertBox: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ERROR_BORDER(),
    backgroundColor: ERROR_BG(),
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: ERROR_TEXT(),
    overflow: "hidden",
  },
  amountBox: {
    marginBottom: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: "transparent",
  },
  amountBoxError: { backgroundColor: ERROR_BG(), borderColor: ERROR_RED },
  amountLabel: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: Colors.primary,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  rupee: { fontSize: 28, fontWeight: "700", color: Colors.primary },
  amountInput: {
    width: "80%",
    paddingVertical: 0,
    textAlign: "center",
    fontWeight: "800",
    color: Colors.primary,
  },
  preview: { marginTop: 12, gap: 4 },
  previewHead: {
    marginBottom: 4,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  previewName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    opacity: 0.8,
  },
  previewAmt: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  input: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputFocused: { borderColor: Colors.primary },
  inputError: { borderColor: ERROR_RED, backgroundColor: ERROR_BG() },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectText: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  optionList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionOn: { backgroundColor: Colors.primaryLight },
  optionText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  optionTextOn: { color: Colors.primary, fontWeight: "700" },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: ERROR_RED,
  },
  center: { textAlign: "center" },
  hint: { marginTop: 8, fontSize: 12, color: Colors.textMuted },
  grid2: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridBtn: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  gridBtnOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  gridBtnText: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  gridBtnTextOn: { color: Colors.primary },
  catBtn: { flexDirection: "row", gap: 6, paddingHorizontal: 8 },
  catText: { fontSize: 12, fontWeight: "800", flexShrink: 1 },
  membersWrap: {
    marginTop: 16,
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  membersWrapError: { borderColor: ERROR_RED },
  chips: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: Colors.primary },
  chipOff: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.textPrimary },
  chipTextOn: { color: Colors.onPrimary },
  subCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 16,
  },
  subCardError: { borderColor: ERROR_RED, borderWidth: 2 },
  subTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  subHint: { marginTop: 4, fontSize: 11, color: Colors.textMuted },
  rows: { marginTop: 12, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  rowInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  pctWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  pctSuffix: { fontSize: 14, fontWeight: "700", color: Colors.textMuted },
  total: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  submit: {
    marginTop: 24,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  submitDisabled: { opacity: 0.5 },
  submitPressed: { opacity: 0.85 },
  submitText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "800" },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
}));
