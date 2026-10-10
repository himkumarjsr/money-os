import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { themedStyles, Colors, tintBg } from "@/constants/theme";

/** Map legacy emoji props → purple AppIcon names (🇮🇳 is never mapped). */
const EMOJI_TO_ICON: Record<string, AppIconName> = {
  "🏠": "home",
  "✈️": "calendar",
  "📈": "trending",
  "🎁": "gift",
  "🌴": "sunrise",
  "🏖️": "sunrise",
  "💼": "briefcase",
  "🏢": "bank",
  "🏦": "bank",
  "💰": "coin",
  "📊": "chart",
  "🌾": "doc",
  "💫": "doc",
  "📒": "notebook",
  "🩺": "hospital",
  "📑": "doc",
  "🧾": "receipt",
  "🔁": "briefcase",
  "🔒": "lock",
  "💡": "bulb",
};

/** 44×24 track, 18px thumb — matches the PWA section switch. */
export function ToggleSwitch({
  isOn,
  onToggle,
  accessibilityLabel,
}: {
  isOn: boolean;
  onToggle: (val: boolean) => void;
  accessibilityLabel?: string;
}) {
  const x = useRef(new Animated.Value(isOn ? 20 : 0)).current;
  useEffect(() => {
    Animated.timing(x, {
      toValue: isOn ? 20 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOn, x]);

  return (
    <Pressable
      onPress={() => onToggle(!isOn)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      accessibilityLabel={accessibilityLabel}
      style={styles.switchHit}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: isOn ? "#534AB7" : tintBg("#E8E6F0") },
        ]}
      >
        <Animated.View
          style={[styles.thumb, { transform: [{ translateX: x }] }]}
        />
      </View>
    </Pressable>
  );
}

export function ToggleSection({
  emoji,
  icon,
  title,
  subtitle,
  oneLiner,
  isOn,
  onToggle,
  children,
}: {
  id: string;
  emoji?: string;
  icon?: AppIconName;
  title: string;
  subtitle: string;
  /** Extra grey helper line under the subtitle (clamped to two lines on phones). */
  oneLiner?: string;
  isOn: boolean;
  onToggle: (val: boolean) => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isOn) setExpanded(false);
  }, [isOn]);

  const resolvedIcon: AppIconName =
    icon ?? (emoji ? EMOJI_TO_ICON[emoji] : undefined) ?? "doc";

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: isOn ? "#534AB7" : tintBg("#E8E6F0") },
      ]}
    >
      <View style={[styles.header, isOn && styles.headerOn]}>
        <View style={styles.headLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: isOn ? tintBg("#EEEDFE") : tintBg("#F7F7F4") },
            ]}
          >
            <AppIcon name={resolvedIcon} size={20} color={Colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {oneLiner ? (
              <Text style={styles.oneLiner} numberOfLines={2}>
                {oneLiner}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.controls}>
          <ToggleSwitch
            isOn={isOn}
            onToggle={onToggle}
            accessibilityLabel={isOn ? "Disable section" : "Enable section"}
          />
          {isOn ? (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? "Collapse section" : "Expand section"
              }
              style={({ pressed }) => [
                styles.chevronBtn,
                pressed && { backgroundColor: Colors.surfaceMuted },
              ]}
            >
              <View
                style={expanded ? { transform: [{ rotate: "180deg" }] } : null}
              >
                <AppIcon name="chevronDown" size={18} color={Colors.primary} />
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>

      {isOn && expanded ? (
        <View style={styles.body}>
          <View style={{ height: 12 }} />
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerOn: { backgroundColor: Colors.background },
  headLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  textCol: { flex: 1, minWidth: 0, paddingRight: 4 },
  title: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textMuted,
  },
  oneLiner: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: Colors.textMuted,
  },
  controls: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchHit: { borderRadius: 999, padding: 4 },
  track: { width: 44, height: 24, borderRadius: 12 },
  thumb: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
}));
