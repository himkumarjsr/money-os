import type { ReactNode } from "react";
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { Colors } from "@/constants/theme";

const TOGGLE_ANIMATION = LayoutAnimation.create(
  180,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

/** Call before flipping a panel's `open` state from outside the header (e.g. auto-open). */
export function animateNextPanelToggle() {
  LayoutAnimation.configureNext(TOGGLE_ANIMATION);
}

/**
 * Accordion panel shared by Credit card dues + Obligations (web CollapsiblePanel).
 * Expands in place so the surrounding scroll position stays stable.
 */
export function CollapsiblePanel({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
  headerRight,
  defaultBorder = true,
}: {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  headerRight?: ReactNode;
  defaultBorder?: boolean;
}) {
  return (
    <View style={[styles.panel, defaultBorder && styles.panelBorder]}>
      <Pressable
        onPress={() => {
          animateNextPanelToggle();
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={[styles.header, open && styles.headerOpen]}
      >
        <View style={styles.iconBadge}>
          <AppIcon name={icon} size={16} color={Colors.primary} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerRight}
        <AppIcon
          name={open ? "chevronDown" : "chevronRight"}
          size={18}
          color={Colors.primary}
        />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  panelBorder: { borderWidth: 1, borderColor: Colors.border },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
  },
  headerOpen: { backgroundColor: "#F7F5FF" },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  body: { paddingHorizontal: 12, paddingBottom: 12 },
});
