import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { DateField } from "@/components/tracker/DateField";
import { Colors, themedStyles } from "@/constants/theme";
import {
  BILL_CATEGORIES,
  BILL_CATEGORY_GROUPS,
  BILL_FREQUENCIES,
  MONTH_NAMES,
  REMIND_DAY_CHOICES,
  defaultRemindDaysFor,
  isAmountOptionalCategory,
  toYmd,
} from "@/lib/billsCalendar";

export type ObligationFormPayload = {
  title: string;
  category: string;
  amount: number;
  frequency: string;
  due_day: number | null;
  due_month: number | null;
  /** One-time only: YYYY-MM-DD. */
  due_date?: string | null;
  source: string;
  is_active: boolean;
  remind_days_before: number;
};

const TITLE_HINTS: Record<string, string> = {
  bill_electricity: "e.g. BESCOM electricity",
  bill_internet: "e.g. Airtel broadband",
  bill_mobile: "e.g. Jio postpaid",
  vehicle_puc: "e.g. Swift PUC",
  document_expiry: "e.g. Passport, driving licence",
  fd_maturity: "e.g. SBI FD maturity",
  school_fees: "e.g. Riya school fees",
  tax: "e.g. Advance tax instalment",
  property_tax: "e.g. BBMP property tax",
};

/** Add / edit obligation or bill — port of web AddObligationForm. */
export function AddObligationForm({
  onSave,
  onClose,
  initial,
  submitLabel,
  defaults,
  noun = "obligation",
}: {
  onSave: (data: ObligationFormPayload) => Promise<void>;
  onClose: () => void;
  /** When set, the form opens in edit mode with these values. */
  initial?: Partial<ObligationFormPayload> | null;
  submitLabel?: string;
  /** Prefill for a new entry (not edit mode). */
  defaults?: Partial<ObligationFormPayload> | null;
  /** Word for the heading, e.g. "bill" on the Bills screen. */
  noun?: string;
}) {
  const seed = initial ?? defaults ?? null;
  const [title, setTitle] = useState(seed?.title ?? "");
  const [category, setCategory] = useState(seed?.category ?? "loan_emi");
  const [amount, setAmount] = useState(
    seed?.amount != null && seed.amount > 0 ? String(seed.amount) : "",
  );
  const [frequency, setFrequency] = useState(seed?.frequency ?? "monthly");
  const [dueDay, setDueDay] = useState(
    seed?.due_day != null ? String(seed.due_day) : "",
  );
  const [dueMonth, setDueMonth] = useState(
    seed?.due_month != null ? String(seed.due_month) : "",
  );
  const [dueDate, setDueDate] = useState(
    seed?.due_date ?? (seed?.frequency === "one_time" ? toYmd(new Date()) : ""),
  );
  const [remindDays, setRemindDays] = useState<number>(
    seed?.remind_days_before ?? defaultRemindDaysFor(seed?.category),
  );
  const [remindTouched, setRemindTouched] = useState(
    seed?.remind_days_before != null,
  );
  const [monthOpen, setMonthOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  const amountOptional = isAmountOptionalCategory(category);
  const amountNum = amount ? parseFloat(amount) : 0;
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
  const needsMonth = frequency === "yearly";
  const needsDate = frequency === "one_time";
  const showDayGrid = frequency !== "one_time";
  const showFirstMonth =
    frequency === "quarterly" || frequency === "half_yearly";
  const canSave = Boolean(
    title.trim() &&
    (hasAmount || amountOptional) &&
    (!needsMonth || dueMonth) &&
    (!needsDate || dueDate),
  );

  const pickCategory = (value: string) => {
    setCategory(value);
    if (!remindTouched) setRemindDays(defaultRemindDaysFor(value));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        title: title.trim(),
        category,
        amount: hasAmount ? amountNum : 0,
        frequency,
        due_day: showDayGrid && dueDay ? parseInt(dueDay, 10) : null,
        due_month:
          (needsMonth || showFirstMonth) && dueMonth
            ? parseInt(dueMonth, 10)
            : null,
        due_date: needsDate ? dueDate || null : null,
        source: "manual",
        is_active: true,
        remind_days_before: remindDays,
      });
    } catch (err) {
      console.warn("obligation save failed:", err);
      setSaveError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <View style={styles.headRow}>
        <Text style={styles.title}>
          {isEdit ? `Edit ${noun}` : `Add ${noun}`}
        </Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>What is it?</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={
          TITLE_HINTS[category] ?? "e.g. LIC Premium, HDFC Home Loan"
        }
        placeholderTextColor={Colors.textMuted}
        autoFocus={!isEdit}
        style={styles.input}
      />

      <Text style={[styles.label, styles.labelSpaced]}>Category</Text>
      {BILL_CATEGORY_GROUPS.map((group) => {
        const items = BILL_CATEGORIES.filter((c) => c.group === group);
        if (items.length === 0) return null;
        return (
          <View key={group} style={styles.group}>
            <Text style={styles.groupLabel}>{group}</Text>
            <View style={styles.wrap}>
              {items.map((c) => {
                const active = category === c.value;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => pickCategory(c.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text
                      style={[styles.pillText, active && styles.pillTextActive]}
                    >
                      {c.emoji} {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <Text style={[styles.label, styles.labelSpaced]}>
        Amount (₹){amountOptional ? " · optional" : ""}
      </Text>
      <TextInput
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
        style={[styles.input, styles.amountInput]}
      />

      <Text style={[styles.label, styles.labelSpaced]}>How often?</Text>
      <View style={styles.wrap}>
        {BILL_FREQUENCIES.map((f) => {
          const active = frequency === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => {
                setFrequency(f.value);
                // The native date field shows today until tapped; save that.
                if (f.value === "one_time" && !dueDate) {
                  setDueDate(toYmd(new Date()));
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {needsMonth || showFirstMonth ? (
        <>
          <Text style={[styles.label, styles.labelSpaced]}>
            {needsMonth ? "Which month?" : "First due month"}
          </Text>
          <Pressable
            onPress={() => setMonthOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel={needsMonth ? "Which month?" : "First due month"}
            accessibilityState={{ expanded: monthOpen }}
            style={[styles.input, styles.select]}
          >
            <Text
              style={[
                styles.selectText,
                !dueMonth && { color: Colors.textMuted },
              ]}
            >
              {dueMonth
                ? MONTH_NAMES[Number(dueMonth) - 1]
                : needsMonth
                  ? "Select month"
                  : "Mar, Jun, Sep, Dec"}
            </Text>
            <Text style={styles.selectChevron}>▼</Text>
          </Pressable>
          {monthOpen ? (
            <View style={styles.monthList}>
              {MONTH_NAMES.map((m, i) => {
                const active = dueMonth === String(i + 1);
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setDueMonth(String(i + 1));
                      setMonthOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.monthRow, active && styles.pillActive]}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        active && styles.pillTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </>
      ) : null}

      {needsDate ? (
        <View style={styles.labelSpaced}>
          <DateField
            label="Due date"
            value={dueDate}
            onChange={setDueDate}
            max="2099-12-31"
          />
        </View>
      ) : null}

      {showDayGrid ? (
        <>
          <Text style={[styles.label, styles.labelSpaced]}>
            Due date (day of month)
          </Text>
          <View style={styles.dayGrid}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const active = dueDay === String(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => setDueDay(String(day))}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.dayCell, active && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={[styles.label, styles.labelSpaced]}>Remind me</Text>
      <View style={styles.wrap}>
        {REMIND_DAY_CHOICES.map((d) => {
          const active = remindDays === d;
          return (
            <Pressable
              key={d}
              onPress={() => {
                setRemindDays(d);
                setRemindTouched(true);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {d === 1 ? "1 day" : `${d} days`} before
              </Text>
            </Pressable>
          );
        })}
      </View>

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

      <Pressable
        onPress={() => void handleSave()}
        disabled={!canSave || saving}
        accessibilityRole="button"
        style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
      >
        <Text
          style={[
            styles.saveText,
            (!canSave || saving) && styles.saveTextDisabled,
          ]}
        >
          {saving ? "Saving…" : submitLabel || (isEdit ? "Update" : "Save")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => ({
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  close: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  labelSpaced: { marginTop: 14 },
  group: { marginBottom: 10 },
  groupLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  amountInput: { fontWeight: "700", color: Colors.primaryText },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pillText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  pillTextActive: { color: Colors.primaryText },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
  },
  selectText: { fontSize: 15, color: Colors.textPrimary },
  selectChevron: { fontSize: 12, color: Colors.textMuted },
  monthList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  monthRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  error: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    color: Colors.error,
  },
  saveBtn: {
    marginTop: 18,
    height: 52,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: Colors.border },
  saveText: { fontSize: 15, fontWeight: "700", color: Colors.onPrimary },
  saveTextDisabled: { color: Colors.textMuted },
}));
