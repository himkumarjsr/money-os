/**
 * Floating glass dock — matches the PWA's mobile bottom nav exactly:
 * Home · Report · Track(+) · Calculators · Profile
 */
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { AppIcon } from "@/components/ui/AppIcon";

const ORDER = [
  "index",
  "analyse",
  "tracker",
  "calculators",
  "profile",
] as const;

const LABELS: Record<(typeof ORDER)[number], string> = {
  index: "Home",
  analyse: "Report",
  tracker: "Track",
  calculators: "Calculators",
  profile: "Profile",
};

function HomeSvg({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5 12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ReportSvg({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FinkoinTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const fk = user?.fkBalance ?? 0;
  const letter = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  const routesByName = Object.fromEntries(
    state.routes.map((r: (typeof state.routes)[number]) => [r.name, r]),
  );

  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomPad }]}
    >
      <View style={styles.dock}>
        <View style={styles.row}>
          {ORDER.map((name) => {
            const route = routesByName[name];
            if (!route) return null;
            const focused =
              state.index ===
              state.routes.findIndex(
                (r: (typeof state.routes)[number]) => r.name === name,
              );
            const color = focused ? Colors.primary : "#3D3A5C";
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                // Cast: tab route names are strings; RN nav typing is generic.
                navigation.navigate(route.name as never);
              }
            };

            if (name === "tracker") {
              return (
                <Pressable
                  key={name}
                  onPress={onPress}
                  style={styles.trackCol}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                >
                  <View style={styles.plusOuter}>
                    {focused ? <View style={styles.plusRing} /> : null}
                    <View style={styles.plusInner}>
                      <Text style={styles.plusText}>+</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.label,
                      focused && styles.labelActive,
                      { color },
                    ]}
                  >
                    {LABELS.tracker}
                  </Text>
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
                      <AppIcon name="calculator" size={22} color={color} />
                    ) : name === "profile" ? (
                      isLoggedIn ? (
                        <View style={styles.avatar}>
                          {user?.photoURL ? (
                            <Image
                              source={{ uri: user.photoURL }}
                              style={styles.avatarImg}
                            />
                          ) : (
                            <Text style={styles.avatarLetter}>{letter}</Text>
                          )}
                          <View style={styles.fkBadge}>
                            <Text style={styles.fkText}>
                              {fk > 999 ? "999+" : String(fk)}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.avatarGuest}>
                          <AppIcon
                            name="user"
                            size={18}
                            color={Colors.primary}
                          />
                        </View>
                      )
                    ) : null}
                  </View>
                </View>
                <Text
                  style={[
                    styles.label,
                    focused && styles.labelActive,
                    { color },
                  ]}
                >
                  {LABELS[name]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(245,243,252,0.94)",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(60,50,120,0.45)",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: { elevation: 14 },
    }),
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
    backgroundColor: "rgba(83,74,183,0.16)",
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.2)",
  },
  iconZ: { zIndex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: "#3D3A5C",
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
    backgroundColor: "#FFFFFF",
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8E6F0",
    shadowColor: "#534AB7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  plusRing: {
    ...StyleSheet.absoluteFill,
    margin: -4,
    borderRadius: 999,
    backgroundColor: "rgba(83,74,183,0.14)",
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.25)",
  },
  plusInner: {
    height: 40,
    width: 40,
    borderRadius: 999,
    backgroundColor: "#534AB7",
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "300",
    marginTop: -2,
  },
  avatar: {
    height: 28,
    width: 28,
    borderRadius: 999,
    backgroundColor: "#534AB7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8E6F0",
    overflow: "hidden",
  },
  avatarImg: {
    height: 28,
    width: 28,
    borderRadius: 999,
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  avatarGuest: {
    height: 28,
    width: 28,
    borderRadius: 999,
    backgroundColor: "#F4F2FC",
    borderWidth: 1,
    borderColor: "#E8E6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  fkBadge: {
    position: "absolute",
    right: -6,
    top: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "#534AB7",
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  fkText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
});
