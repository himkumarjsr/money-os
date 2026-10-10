import { useMemo, useState } from "react";
import { LayoutAnimation, Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors, themedStyles } from "@/constants/theme";
import { localISODate } from "@/lib/localDate";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Inline calendar for policy dates — stand-in for the PWA `<input type="date">`.
 * Unlike the tracker DateField it allows an empty value, has no max, and can
 * jump by year (renewal / purchase dates are often years away).
 */
export function PolicyDateField({
  label,
  optional = false,
  value,
  onChange,
}: {
  label: string;
  optional?: boolean;
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [cursor, setCursor] = useState(() => {
    const d = selected ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const first = cursor.getDay();
    const days = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    const out: Array<number | null> = Array(first).fill(null);
    for (let d = 1; d <= days; d++) out.push(d);
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!open) {
      const d = parseISO(value) ?? new Date();
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    setOpen((v) => !v);
  };

  const shift = (months: number) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + months, 1));

  const display = selected
    ? selected.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Select date";
  const today = localISODate();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        style={[styles.field, open && styles.fieldOpen]}
      >
        <Text style={[styles.fieldText, !selected && styles.placeholder]}>
          {display}
        </Text>
        <AppIcon name="calendar" size={18} color={Colors.primary} />
      </Pressable>

      {open ? (
        <View style={styles.calendar}>
          <View style={styles.calHead}>
            <Pressable
              onPress={() => shift(-12)}
              accessibilityLabel="Previous year"
              style={styles.navBtn}
            >
              <Text style={styles.navText}>«</Text>
            </Pressable>
            <Pressable
              onPress={() => shift(-1)}
              accessibilityLabel="Previous month"
              style={styles.navBtn}
            >
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <Text style={styles.calTitle}>
              {cursor.toLocaleString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </Text>
            <Pressable
              onPress={() => shift(1)}
              accessibilityLabel="Next month"
              style={styles.navBtn}
            >
              <Text style={styles.navText}>›</Text>
            </Pressable>
            <Pressable
              onPress={() => shift(12)}
              accessibilityLabel="Next year"
              style={styles.navBtn}
            >
              <Text style={styles.navText}>»</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`w${i}`} style={styles.weekday}>
                {w}
              </Text>
            ))}
            {cells.map((d, i) => {
              if (d == null) return <View key={`e${i}`} style={styles.cell} />;
              const iso = localISODate(
                new Date(cursor.getFullYear(), cursor.getMonth(), d),
              );
              const on = iso === value;
              const isToday = iso === today;
              return (
                <Pressable
                  key={iso}
                  onPress={() => {
                    onChange(iso);
                    toggle();
                  }}
                  style={styles.cell}
                  accessibilityRole="button"
                  accessibilityLabel={iso}
                >
                  <View
                    style={[
                      styles.day,
                      isToday && !on && styles.dayToday,
                      on && styles.dayOn,
                    ]}
                  >
                    <Text style={[styles.dayText, on && styles.dayTextOn]}>
                      {d}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {optional && value ? (
            <Pressable
              onPress={() => {
                onChange("");
                toggle();
              }}
              style={styles.clearBtn}
              accessibilityRole="button"
            >
              <Text style={styles.clearText}>Clear date</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  optional: { fontWeight: "400", color: Colors.textMuted },
  field: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldOpen: { borderColor: Colors.primary },
  fieldText: { fontSize: 16, color: Colors.textPrimary },
  placeholder: { color: Colors.textMuted },
  calendar: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 8,
  },
  calHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { fontSize: 22, color: Colors.primary, fontWeight: "700" },
  calTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    paddingVertical: 4,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayToday: { borderWidth: 1, borderColor: Colors.primaryMedium },
  dayOn: { backgroundColor: Colors.primary },
  dayText: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  dayTextOn: { color: Colors.onPrimary, fontWeight: "800" },
  clearBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { color: Colors.error, fontWeight: "700", fontSize: 14 },
}));
