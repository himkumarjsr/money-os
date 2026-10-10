import { useEffect, useMemo, useState } from "react";
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

/** Tap-to-open inline calendar — native stand-in for the PWA `<input type="date" max>`. */
export function DateField({
  label = "Date",
  value,
  onChange,
  max,
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  /** Inclusive max selectable date (YYYY-MM-DD). */
  max: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value) ?? new Date();
  const [cursor, setCursor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  useEffect(() => {
    if (!open) {
      const d = parseISO(value) ?? new Date();
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value, open]);

  const maxDate = parseISO(max);
  const canGoNext =
    !maxDate ||
    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) <= maxDate;

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
    setOpen((v) => !v);
  };

  const display = selected.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        style={[styles.field, open && styles.fieldOpen]}
      >
        <Text style={styles.fieldText}>{display}</Text>
        <AppIcon name="calendar" size={18} color={Colors.primary} />
      </Pressable>

      {open ? (
        <View style={styles.calendar}>
          <View style={styles.calHead}>
            <Pressable
              onPress={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
              accessibilityLabel="Previous month"
              style={styles.navBtn}
            >
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <Text style={styles.calTitle}>
              {cursor.toLocaleString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Pressable
              onPress={() =>
                canGoNext &&
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
              disabled={!canGoNext}
              accessibilityLabel="Next month"
              style={[styles.navBtn, !canGoNext && { opacity: 0.3 }]}
            >
              <Text style={styles.navText}>›</Text>
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
              const disabled = iso > max;
              const on = iso === value;
              return (
                <Pressable
                  key={iso}
                  disabled={disabled}
                  onPress={() => {
                    onChange(iso);
                    toggle();
                  }}
                  style={styles.cell}
                >
                  <View style={[styles.day, on && styles.dayOn]}>
                    <Text
                      style={[
                        styles.dayText,
                        on && styles.dayTextOn,
                        disabled && styles.dayTextOff,
                      ]}
                    >
                      {d}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  field: {
    height: 48,
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
  navText: { fontSize: 24, color: Colors.primary, fontWeight: "700" },
  calTitle: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
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
  dayOn: { backgroundColor: Colors.primary },
  dayText: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  dayTextOn: { color: Colors.onPrimary, fontWeight: "800" },
  dayTextOff: { color: Colors.slate300 },
}));
