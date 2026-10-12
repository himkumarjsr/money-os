/**
 * Floating glass dock — matches the PWA's mobile bottom nav exactly:
 * Home · Report · Track(+) · Calculators · Profile
 *
 * Rendered once by the root layout (components/navigation/GlobalChrome.tsx) so
 * it appears on every screen the web navbar does, not only on the tab screens.
 */
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors, Radius, Shadow, themedStyles, brand } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  GoldStrokeDefs,
  GoldText,
  isMirrorGold,
} from "@/components/ui/GoldMirror";

export const DOCK_ORDER = [
  "index",
  "analyse",
  "tracker",
  "calculators",
  "profile",
] as const;
export type DockId = (typeof DOCK_ORDER)[number];
const ORDER = DOCK_ORDER;

const LABELS: Record<(typeof ORDER)[number], string> = {
  index: "Home",
  analyse: "Report",
  tracker: "Track",
  calculators: "Calculators",
  profile: "Profile",
};

function HomeSvg({ color }: { color: string }) {
  const paint = isMirrorGold(color) ? "url(#fkTabHome)" : color;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {paint !== color ? <GoldStrokeDefs id="fkTabHome" /> : null}
      <Path
        d="M3 10.5 12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
        stroke={paint}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ReportSvg({ color }: { color: string }) {
  const paint = isMirrorGold(color) ? "url(#fkTabReport)" : color;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {paint !== color ? <GoldStrokeDefs id="fkTabReport" /> : null}
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke={paint}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6"
        stroke={paint}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type DockProps = {
  active: DockId | null;
  /** Web: scale 0.96 and a smaller "+" once the page is scrolled 20px. */
  compact?: boolean;
  onSelect: (id: DockId) => void;
};

export function FinkoinDock({ active, compact = false, onSelect }: DockProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const fk = user?.fkBalance ?? 0;
  const letter = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomPad }]}
    >
      <View style={[styles.dock, compact && styles.dockCompact]}>
        <View style={styles.row}>
          {ORDER.map((name) => {
            const focused = active === name;
            const color = focused ? Colors.primary : Colors.tabIdle;
            // Track is a plain link to the tracker, same as web (no `add` param).
            const onPress = () => onSelect(name);

            if (name === "tracker") {
              return (
                <Pressable
                  key={name}
                  onPress={onPress}
                  style={styles.trackCol}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                >
                  <View
                    style={[styles.plusOuter, compact && styles.plusOuterCompact]}
                  >
                    {focused ? <View style={styles.plusRing} /> : null}
                    <View
                      style={[
                        styles.plusInner,
                        compact && styles.plusInnerCompact,
                      ]}
                    >
                      <Text style={styles.plusText}>+</Text>
                    </View>
                  </View>
                  <GoldText
                    style={[
                      styles.label,
                      focused && styles.labelActive,
                      { color },
                    ]}
                  >
                    {LABELS.tracker}
                  </GoldText>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={name}
                onPress={onPress}
                style={styles.col}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
              >
                <View style={styles.iconSlot}>
                  {focused ? <View style={styles.pill} /> : null}
                  <View style={styles.iconZ}>
                    {name === "index" ? (
                      <HomeSvg color={color} />
                    ) : name === "analyse" ? (
                      <ReportSvg color={color} />
                    ) : name === "calculators" ? (
                      <AppIcon
                        name="calculator"
                        size={24}
                        strokeWidth={1.5}
                        color={color}
                      />
                    ) : name === "profile" ? (
                      isLoggedIn ? (
                        <View style={styles.avatarWrap}>
                          <View style={styles.avatar}>
                            {user?.photoURL ? (
                              <Image
                                source={{ uri: user.photoURL }}
                                style={styles.avatarImg}
                              />
                            ) : (
                              <Text style={styles.avatarLetter}>{letter}</Text>
                            )}
                          </View>
                          {/* Outside the clipped circle so the FK count is never cut off. */}
                          <View
                            style={[
                              styles.fkBadge,
                              // Sized from the label: the 28px avatar would otherwise clip "999+".
                              { width: fkLabel(fk).length * 6 + 10 },
                            ]}
                          >
                            <Text style={styles.fkText} numberOfLines={1}>
                              {fkLabel(fk)}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.avatarGuest}>
                          <AppIcon
                            name="user"
                            size={18}
                            color={Colors.primaryText}
                          />
                        </View>
                      )
                    ) : null}
                  </View>
                </View>
                <GoldText
                  style={[
                    styles.label,
                    focused && styles.labelActive,
                    { color },
                  ]}
                >
                  {LABELS[name]}
                </GoldText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const fkLabel = (fk: number) => (fk > 999 ? "999+" : String(fk));

const styles = themedStyles(() => ({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  dock: {
    width: "100%",
    maxWidth: 440,
    borderRadius: Radius.dock,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    ...Shadow.dock,
  },
  dockCompact: {
    transform: [{ scale: 0.96 }],
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 4,
    paddingTop: 2,
    gap: 4,
  },
  trackCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  iconSlot: {
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primaryTintBorder,
  },
  iconZ: { zIndex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.tabIdle,
  },
  labelActive: {
    fontWeight: "600",
  },
  plusOuter: {
    marginTop: -28,
    marginBottom: 2,
    height: 48,
    width: 48,
    borderRadius: 999,
    backgroundColor: Colors.card,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: brand("#534AB7"),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  plusOuterCompact: {
    height: 44,
    width: 44,
  },
  plusInnerCompact: {
    height: 36,
    width: 36,
  },
  plusRing: {
    ...StyleSheet.absoluteFill,
    margin: -4,
    borderRadius: 999,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primaryTintBorder,
  },
  plusInner: {
    height: 40,
    width: 40,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    color: Colors.onPrimary,
    fontSize: 26,
    fontWeight: "300",
    marginTop: -2,
  },
  avatarWrap: {
    height: 28,
    width: 28,
  },
  avatar: {
    height: 28,
    width: 28,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  avatarImg: {
    height: 28,
    width: 28,
    borderRadius: 999,
  },
  avatarLetter: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  avatarGuest: {
    height: 28,
    width: 28,
    borderRadius: 999,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  fkBadge: {
    position: "absolute",
    right: -8,
    top: -5,
    minWidth: 18,
    height: 16,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.card,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  fkText: {
    color: Colors.onPrimary,
    fontSize: 9,
    fontWeight: "700",
  },
}));
