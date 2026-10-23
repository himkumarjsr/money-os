/**
 * "Why Finkoin" intro video - port of web components/IntroTourVideo.tsx. An
 * animated, auto-playing tour of the key features: plays once on a new
 * install (after the splash) and {@link IntroTourButton} opens it again.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { BrandCoin } from "@/components/ui/BrandCoin";
import {
  Colors,
  FINKOIN_TAGLINE,
  HERO_GRADIENT,
  brand,
  getActiveTheme,
  themedStyles,
} from "@/constants/theme";
import { openContentHref } from "@/lib/contentLinks";
import {
  closeIntroTour,
  hasSeenIntroTour,
  markIntroTourSeen,
  openIntroTour,
  useIntroTourStore,
} from "@/lib/introTour";

/** First launch: wait for the animated splash to finish first. */
const AUTO_OPEN_DELAY_MS = 3200;

type Scene = {
  id: string;
  eyebrow: string;
  title: string;
  caption: string;
  ms: number;
  link?: { href: string; label: string };
  Visual: () => ReactNode;
};

const SCENES: readonly Scene[] = [
  {
    id: "why",
    eyebrow: "Why Finkoin",
    title: "Your whole money life, in one app",
    caption:
      "Your money is spread across banks, apps and spreadsheets. Finkoin puts it in one place and shows you what to do next.",
    ms: 4000,
    Visual: WhyVisual,
  },
  {
    id: "analyse",
    eyebrow: "Analyse",
    title: "Know where you stand in 5 minutes",
    caption:
      "A free health check scores your emergency fund, insurance, loans and savings. No PAN, no Aadhaar.",
    ms: 4500,
    link: { href: "/analyse", label: "Start free check" },
    Visual: AnalyseVisual,
  },
  {
    id: "budget",
    eyebrow: "Budget split",
    title: "Give every rupee a job",
    caption:
      "Finkoin splits your salary into needs, wants, safety, loans and investing, tuned to your stage of life.",
    ms: 4500,
    link: { href: "/analyse", label: "Get my split" },
    Visual: BudgetVisual,
  },
  {
    id: "tracker",
    eyebrow: "Daily expense tracker",
    title: "Log a spend in seconds",
    caption:
      "Add chai, metro or groceries as you go. Your month stays on budget and bills never slip.",
    ms: 4500,
    link: { href: "/tracker", label: "Open tracker" },
    Visual: TrackerVisual,
  },
  {
    id: "split",
    eyebrow: "Settle Up",
    title: "Split trips and flats, no awkward maths",
    caption:
      "Add who paid and Finkoin works out who owes whom, in the fewest payments.",
    ms: 4500,
    link: { href: "/split", label: "Start a group" },
    Visual: SplitVisual,
  },
  {
    id: "manage",
    eyebrow: "Manage your finances",
    title: "Net worth, goals and bills together",
    caption:
      "See what you own and owe, track goals like a home or car, and get reminded before every due date.",
    ms: 4500,
    link: { href: "/investments", label: "Add assets" },
    Visual: ManageVisual,
  },
  {
    id: "start",
    eyebrow: "Free to start",
    title: FINKOIN_TAGLINE,
    caption:
      "Start with the free health check. It takes about 5 minutes and needs no documents.",
    ms: 3500,
    Visual: StartVisual,
  },
];

const TOTAL_SECONDS = Math.round(
  SCENES.reduce((sum, s) => sum + s.ms, 0) / 1000,
);

/** The stage backdrop per theme, like the PWA's `--fi-stage`. */
const STAGE = {
  light: "linear-gradient(160deg, #6A61D1 0%, #534AB7 48%, #3C3489 100%)",
  dark: "linear-gradient(160deg, #2A2466 0%, #17143A 55%, #221D52 100%)",
  premium: HERO_GRADIENT,
} as const;

const STAGE_FLAT = { light: "#534AB7", dark: "#1E1A44", premium: "#12100B" };

let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduceMotion = v;
  })
  .catch(() => {});

/** Mount once in the root layout. */
export function IntroTourVideo() {
  const source = useIntroTourStore((s) => s.source);

  useEffect(() => {
    if (hasSeenIntroTour()) return;
    const timer = setTimeout(() => {
      if (!hasSeenIntroTour()) openIntroTour("auto");
    }, AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!source) return null;
  return <IntroTourPlayer />;
}

function IntroTourPlayer() {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const scene = SCENES[index]!;
  const isLast = index === SCENES.length - 1;
  const theme = getActiveTheme();
  const stageHeight = Math.min(300, Math.max(250, height * 0.36));

  useEffect(() => {
    markIntroTourSeen();
  }, []);

  // Restart the active bar on every scene change.
  useEffect(() => {
    progress.setValue(0);
    setPaused(false);
  }, [index, progress]);

  // Run (or resume) the active bar; when it fills, move to the next scene.
  useEffect(() => {
    if (paused) return;
    let current = 0;
    const id = progress.addListener(({ value }) => {
      current = value;
    });
    progress.stopAnimation((v) => {
      current = v;
    });
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(0, scene.ms * (1 - current)),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished && index < SCENES.length - 1) setIndex(index + 1);
    });
    return () => {
      anim.stop();
      progress.removeListener(id);
    };
  }, [index, paused, progress, scene.ms]);

  const go = (delta: number) =>
    setIndex((i) => Math.min(SCENES.length - 1, Math.max(0, i + delta)));

  const onLink = (href: string) => {
    closeIntroTour();
    openContentHref(href);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeIntroTour}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeIntroTour}
          accessibilityLabel="Close the intro video"
        />
        <View
          style={[styles.card, { width: Math.min(400, width - 32) }]}
          accessibilityViewIsModal
        >
          <View
            style={[
              styles.stage,
              {
                backgroundColor: STAGE_FLAT[theme],
                experimental_backgroundImage: STAGE[theme],
              },
            ]}
          >
            <View style={styles.topRow}>
              <View style={styles.bars}>
                {SCENES.map((s, i) => (
                  <View key={s.id} style={styles.barTrack}>
                    {i < index ? (
                      <View style={[styles.barFill, { width: "100%" }]} />
                    ) : i === index ? (
                      <Animated.View
                        style={[
                          styles.barFill,
                          {
                            width: progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            }),
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
              <Pressable
                onPress={closeIntroTour}
                style={styles.close}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close the intro video"
              >
                <AppIcon name="close" size={15} color={onStageColor()} />
              </Pressable>
            </View>

            <View style={{ height: stageHeight }}>
              <View key={scene.id} style={styles.sceneBox}>
                <scene.Visual />
              </View>
              {/* Tap the left third to go back, the rest to skip ahead. */}
              <Pressable
                style={[styles.tapZone, { left: 0, width: "33%" }]}
                onPress={() => go(-1)}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Pressable
                style={[styles.tapZone, { right: 0, width: "67%" }]}
                onPress={() => go(1)}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            bounces={false}
          >
            <View accessibilityLiveRegion="polite">
              <Text style={styles.eyebrow}>
                {scene.eyebrow.toUpperCase()}
                <Text style={styles.count}>
                  {"  "}
                  {index + 1} of {SCENES.length}
                </Text>
              </Text>
              <Text style={styles.title} accessibilityRole="header">
                {scene.title}
              </Text>
              <Text style={styles.caption}>{scene.caption}</Text>
            </View>

            {isLast ? (
              <View style={styles.ctaCol}>
                <Pressable
                  onPress={() => onLink("/analyse")}
                  style={styles.cta}
                  accessibilityRole="button"
                >
                  <Text style={styles.ctaText}>Start free health check</Text>
                </Pressable>
                <Pressable
                  onPress={() => onLink("/features")}
                  style={styles.ctaGhost}
                  accessibilityRole="button"
                >
                  <Text style={styles.ctaGhostText}>See all features</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.controls}>
              <ControlButton
                label="Previous"
                onPress={() => go(-1)}
                disabled={index === 0}
              >
                <Glyph kind="left" />
              </ControlButton>
              {isLast ? (
                <ControlButton label="Replay" onPress={() => setIndex(0)}>
                  <Glyph kind="replay" />
                </ControlButton>
              ) : (
                <ControlButton
                  label={paused ? "Play" : "Pause"}
                  onPress={() => setPaused((p) => !p)}
                >
                  <Glyph kind={paused ? "play" : "pause"} />
                </ControlButton>
              )}
              <ControlButton
                label="Next"
                onPress={() => go(1)}
                disabled={isLast}
              >
                <Glyph kind="right" />
              </ControlButton>
              <View style={{ flex: 1 }} />
              {scene.link ? (
                <Pressable
                  onPress={() => onLink(scene.link!.href)}
                  style={styles.sceneLink}
                  accessibilityRole="link"
                >
                  <Text style={styles.sceneLinkText}>{scene.link.label} →</Text>
                </Pressable>
              ) : isLast ? null : (
                <Text style={styles.count}>{TOTAL_SECONDS}-sec tour</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ControlButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.ctrl, disabled && { opacity: 0.35 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
    >
      {children}
    </Pressable>
  );
}

export function Glyph({
  kind,
  size = 15,
  color,
}: {
  kind: "left" | "right" | "play" | "pause" | "replay";
  size?: number;
  color?: string;
}) {
  const c = color ?? Colors.textPrimary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {kind === "play" ? (
        <Path
          d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"
          fill={c}
        />
      ) : kind === "pause" ? (
        <>
          <Rect x="5" y="4" width="5" height="16" rx="1.5" fill={c} />
          <Rect x="14" y="4" width="5" height="16" rx="1.5" fill={c} />
        </>
      ) : (
        <Path
          d={
            kind === "left"
              ? "M15 6l-6 6 6 6"
              : kind === "right"
                ? "M9 6l6 6-6 6"
                : "M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5"
          }
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </Svg>
  );
}

/* ---------- Animation helpers ---------- */

/** 0 -> 1 after `delay` ms (instant with Reduce Motion on). */
function useEntrance(delay: number, duration = 400, spring = false) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const anim = spring
      ? Animated.spring(v, {
          toValue: 1,
          delay,
          friction: 5,
          tension: 80,
          useNativeDriver: false,
        })
      : Animated.timing(v, {
          toValue: 1,
          delay,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        });
    anim.start();
    return () => anim.stop();
  }, [v, delay, duration, spring]);
  return v;
}

function Rise({
  delay,
  from = { y: 14 },
  style,
  children,
}: {
  delay: number;
  from?: { x?: number; y?: number; scale?: number };
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const v = useEntrance(delay, 400, from.scale != null);
  const transform = [
    ...(from.x != null
      ? [
          {
            translateX: v.interpolate({
              inputRange: [0, 1],
              outputRange: [from.x, 0],
            }),
          },
        ]
      : []),
    ...(from.y != null
      ? [
          {
            translateY: v.interpolate({
              inputRange: [0, 1],
              outputRange: [from.y, 0],
            }),
          },
        ]
      : []),
    ...(from.scale != null
      ? [
          {
            scale: v.interpolate({
              inputRange: [0, 1],
              outputRange: [from.scale, 1],
            }),
          },
        ]
      : []),
  ];
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 1, 1],
          }),
          transform,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A bar that grows to `pct`% of its track. */
function GrowBar({
  pct,
  delay,
  duration = 700,
  style,
}: {
  pct: number;
  delay: number;
  duration?: number;
  style: StyleProp<ViewStyle>;
}) {
  const v = useEntrance(delay, duration);
  return (
    <Animated.View
      style={[
        style,
        {
          width: v.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", `${pct}%`],
          }),
        },
      ]}
    />
  );
}

function useCountUp(to: number, delay: number, duration = 1200): number {
  const v = useEntrance(delay, duration);
  const [value, setValue] = useState(reduceMotion ? to : 0);
  useEffect(() => {
    const id = v.addListener(({ value: x }) => setValue(Math.round(x * to)));
    return () => v.removeListener(id);
  }, [v, to]);
  return value;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ---------- Scene visuals ---------- */

function PhoneCard({ children }: { children: ReactNode }) {
  return (
    <Rise delay={0} from={{ y: 18, scale: 0.96 }} style={styles.phone}>
      {children}
    </Rise>
  );
}

function Pill({
  tone,
  icon,
  children,
}: {
  tone: "success" | "warning" | "primary";
  icon?: AppIconName;
  children: ReactNode;
}) {
  const fg =
    tone === "success"
      ? Colors.successText
      : tone === "warning"
        ? Colors.warningText
        : Colors.primaryText;
  const bg =
    tone === "success"
      ? Colors.successLight
      : tone === "warning"
        ? Colors.warningLight
        : Colors.primaryLight;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <AppIcon name={icon} size={11} color={fg} /> : null}
      <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}

function WhyVisual() {
  const chips: { icon: AppIconName; label: string }[] = [
    { icon: "chart", label: "Analyse" },
    { icon: "wallet", label: "Budget" },
    { icon: "notebook", label: "Track" },
    { icon: "users", label: "Split" },
    { icon: "target", label: "Goals" },
    { icon: "calendar", label: "Bills" },
  ];
  const flip = useEntrance(0, 1100);
  return (
    <View style={styles.center}>
      <Animated.View
        style={{
          opacity: flip,
          transform: [
            { perspective: 600 },
            {
              rotateY: flip.interpolate({
                inputRange: [0, 1],
                outputRange: ["-360deg", "0deg"],
              }),
            },
            {
              scale: flip.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
          ],
        }}
      >
        <BrandCoin size={72} />
      </Animated.View>
      <Rise delay={700}>
        <Text style={styles.stageTitle}>Finkoin</Text>
      </Rise>
      <View style={styles.chipGrid}>
        {chips.map((c, i) => (
          <Rise key={c.label} delay={1100 + i * 220} from={{ scale: 0.6 }}>
            <View style={styles.chip}>
              <AppIcon name={c.icon} size={13} color={onStageColor()} />
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
          </Rise>
        ))}
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnalyseVisual() {
  const score = useCountUp(72, 350, 1400);
  const ring = useEntrance(350, 1400);
  const r = 42;
  const len = 2 * Math.PI * r;
  const rows: { label: string; value: string; ok: boolean }[] = [
    { label: "Emergency fund", value: "4 of 6 months", ok: true },
    { label: "Term cover", value: "Gap found", ok: false },
    { label: "Loans", value: "Healthy", ok: true },
  ];
  return (
    <PhoneCard>
      <View style={styles.row}>
        <View style={{ width: 80, height: 80 }}>
          <Svg
            width={80}
            height={80}
            viewBox="0 0 100 100"
            style={{ transform: [{ rotate: "-90deg" }] }}
          >
            <Circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={Colors.primaryLight}
              strokeWidth={10}
            />
            <AnimatedCircle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={Colors.primary}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${len} ${len}`}
              strokeDashoffset={ring.interpolate({
                inputRange: [0, 1],
                outputRange: [len, len * (1 - 0.72)],
              })}
            />
          </Svg>
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text style={styles.score}>{score}</Text>
            <Text style={styles.muted10}>/ 100</Text>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={styles.label}>MONEY SCORE</Text>
          <Rise delay={1600}>
            <Pill tone="success" icon="check">
              On track
            </Pill>
          </Rise>
        </View>
      </View>
      <View style={{ gap: 6, marginTop: 12 }}>
        {rows.map((row, i) => (
          <Rise key={row.label} delay={1900 + i * 350} style={styles.listRow}>
            <Text style={styles.rowText}>{row.label}</Text>
            <Pill
              tone={row.ok ? "success" : "warning"}
              icon={row.ok ? "check" : "bell"}
            >
              {row.value}
            </Pill>
          </Rise>
        ))}
      </View>
    </PhoneCard>
  );
}

const BUCKETS = [
  { label: "Needs", pct: 30, color: "#6C63E0" },
  { label: "Wants", pct: 5, color: "#EC6FA7" },
  { label: "Safety", pct: 10, color: "#2BB673" },
  { label: "Loans", pct: 30, color: "#F08A4B" },
  { label: "Invest", pct: 25, color: "#3B9BF0" },
] as const;

function BudgetVisual() {
  const income = 80_000;
  return (
    <PhoneCard>
      <Text style={styles.label}>MONTHLY TAKE-HOME</Text>
      <Text style={styles.big}>{inr(income)}</Text>
      <View style={styles.stackTrack}>
        {BUCKETS.map((b, i) => (
          <GrowBar
            key={b.label}
            pct={b.pct}
            delay={400 + i * 300}
            duration={500}
            style={{ height: "100%", backgroundColor: brand(b.color) }}
          />
        ))}
      </View>
      <View style={{ gap: 4, marginTop: 10 }}>
        {BUCKETS.map((b, i) => (
          <Rise key={b.label} delay={500 + i * 300} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: brand(b.color) }]} />
            <Text style={[styles.rowText, { flex: 1 }]}>{b.label}</Text>
            <Text style={[styles.muted12, { width: 36, textAlign: "right" }]}>
              {b.pct}%
            </Text>
            <Text style={[styles.rowStrong, { width: 70, textAlign: "right" }]}>
              {inr((income * b.pct) / 100)}
            </Text>
          </Rise>
        ))}
      </View>
    </PhoneCard>
  );
}

function TrackerVisual() {
  const spent = useCountUp(18_420, 1600, 1000);
  const entries: {
    icon: AppIconName;
    label: string;
    cat: string;
    amount: number;
  }[] = [
    { icon: "coin", label: "Chai & samosa", cat: "Food", amount: 60 },
    { icon: "briefcase", label: "Metro to office", cat: "Travel", amount: 45 },
    { icon: "home", label: "Groceries", cat: "Needs", amount: 1_240 },
  ];
  return (
    <PhoneCard>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Today</Text>
        <Rise delay={2600}>
          <Pill tone="warning" icon="flame">
            7-day streak
          </Pill>
        </Rise>
      </View>
      <View style={{ gap: 6, marginTop: 8 }}>
        {entries.map((e, i) => (
          <Rise
            key={e.label}
            delay={300 + i * 400}
            from={{ x: 40 }}
            style={styles.listRow}
          >
            <View style={styles.entryIcon}>
              <AppIcon name={e.icon} size={14} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowStrong} numberOfLines={1}>
                {e.label}
              </Text>
              <Text style={styles.muted10}>{e.cat}</Text>
            </View>
            <Text style={styles.rowStrong}>−{inr(e.amount)}</Text>
          </Rise>
        ))}
      </View>
      <Rise delay={1500} style={{ marginTop: 10 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.muted12}>This month</Text>
          <Text style={styles.rowText}>
            <Text style={styles.rowStrong}>{inr(spent)}</Text>
            <Text style={styles.muted12}> of {inr(30_000)}</Text>
          </Text>
        </View>
        <View style={styles.track}>
          <GrowBar
            pct={61}
            delay={1600}
            duration={1000}
            style={[styles.trackFill, { backgroundColor: Colors.success }]}
          />
        </View>
      </Rise>
    </PhoneCard>
  );
}

function SplitVisual() {
  const people = [
    { name: "Rahul", tint: "#6C63E0" },
    { name: "Aman", tint: "#F08A4B" },
    { name: "Priya", tint: "#2BB673" },
  ];
  return (
    <PhoneCard>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cardTitle}>Goa trip</Text>
          <Text style={styles.muted10}>3 friends</Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          {people.map((p, i) => (
            <Rise
              key={p.name}
              delay={200 + i * 150}
              from={{ scale: 0.4 }}
              style={[
                styles.avatar,
                { backgroundColor: brand(p.tint), marginLeft: i ? -8 : 0 },
              ]}
            >
              <Text style={styles.avatarText}>{p.name[0]}</Text>
            </Rise>
          ))}
        </View>
      </View>
      <Rise delay={700} style={[styles.listRow, styles.expense]}>
        <View style={styles.rowBetween}>
          <Text style={styles.rowStrong}>Villa stay</Text>
          <Text style={styles.rowStrong}>{inr(6_000)}</Text>
        </View>
        <Text style={styles.muted10}>
          Rahul paid · split equally, {inr(2_000)} each
        </Text>
      </Rise>
      <Rise delay={1600}>
        <Text style={[styles.label, { marginTop: 10 }]}>SETTLE UP</Text>
      </Rise>
      <View style={{ gap: 6, marginTop: 4 }}>
        {["Aman", "Priya"].map((from, i) => (
          <Rise key={from} delay={1900 + i * 400} style={styles.row}>
            <Text style={styles.rowStrong}>{from}</Text>
            <View style={{ flex: 1 }}>
              <GrowBar
                pct={100}
                delay={2100 + i * 400}
                duration={400}
                style={{ height: 1, backgroundColor: Colors.primary }}
              />
            </View>
            <Text style={styles.rowStrong}>Rahul</Text>
            <Text
              style={[
                styles.rowStrong,
                { width: 56, textAlign: "right", color: Colors.primaryText },
              ]}
            >
              {inr(2_000)}
            </Text>
          </Rise>
        ))}
      </View>
      <Rise delay={3000} style={{ marginTop: 10, alignSelf: "flex-start" }}>
        <Pill tone="success" icon="check">
          Just 2 payments, all square
        </Pill>
      </Rise>
    </PhoneCard>
  );
}

function ManageVisual() {
  const netWorth = useCountUp(12_40_000, 300, 1400);
  const goals = [
    { label: "Home down payment", pct: 42 },
    { label: "New car", pct: 70 },
  ];
  return (
    <PhoneCard>
      <Text style={styles.label}>NET WORTH</Text>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Text style={styles.big}>{inr(netWorth)}</Text>
        <Rise delay={1600}>
          <Pill tone="success" icon="trending">
            +8% this year
          </Pill>
        </Rise>
      </View>
      <View style={{ gap: 8, marginTop: 10 }}>
        {goals.map((g, i) => (
          <Rise key={g.label} delay={1200 + i * 350}>
            <View style={styles.rowBetween}>
              <Text style={styles.rowText}>{g.label}</Text>
              <Text style={styles.muted12}>{g.pct}%</Text>
            </View>
            <View style={styles.track}>
              <GrowBar
                pct={g.pct}
                delay={1400 + i * 350}
                duration={800}
                style={[styles.trackFill, { backgroundColor: Colors.primary }]}
              />
            </View>
          </Rise>
        ))}
      </View>
      <Rise delay={2400} style={styles.billRow}>
        <AppIcon name="bell" size={16} color={Colors.warningText} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowStrong}>Credit card bill</Text>
          <Text style={styles.muted10}>Due in 3 days · {inr(14_500)}</Text>
        </View>
      </Rise>
    </PhoneCard>
  );
}

function StartVisual() {
  const steps = ["Know it", "Fix it", "Grow it"];
  return (
    <View style={styles.center}>
      <Rise delay={0} from={{ scale: 0.6 }}>
        <BrandCoin size={60} />
      </Rise>
      <View style={{ gap: 8, marginTop: 16 }}>
        {steps.map((s, i) => (
          <Rise
            key={s}
            delay={400 + i * 400}
            from={{ x: -20 }}
            style={styles.row}
          >
            <View style={styles.tick}>
              <AppIcon name="check" size={14} color={onStageColor()} />
            </View>
            <Text style={styles.stepText}>{s}.</Text>
          </Rise>
        ))}
      </View>
      <Rise delay={1800}>
        <Text style={styles.stageSmall}>Free · No PAN · Built for India</Text>
      </Rise>
    </View>
  );
}

/** Text and icons on the stage: cream on Premium's gold-black, else white. */
function onStageColor(): string {
  return getActiveTheme() === "premium" ? "#F5EFDC" : "#FFFFFF";
}

const styles = themedStyles(() => {
  const onStage = onStageColor();
  return {
    backdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: 16,
    },
    card: {
      maxHeight: "92%",
      backgroundColor: Colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: "hidden",
      shadowColor: "#140F3C",
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.45,
      shadowRadius: 40,
      elevation: 16,
    },
    stage: { paddingTop: 12 },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      zIndex: 2,
    },
    bars: { flex: 1, flexDirection: "row", gap: 4 },
    barTrack: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    barFill: { height: "100%", backgroundColor: onStage },
    close: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    sceneBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingBottom: 14,
      paddingTop: 6,
    },
    tapZone: { position: "absolute", top: 0, bottom: 0 },
    body: { flexGrow: 0 },
    bodyContent: { padding: 20, paddingTop: 16, gap: 12 },
    eyebrow: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.4,
      color: Colors.primaryText,
    },
    count: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0,
      color: Colors.textMuted,
    },
    title: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
      color: Colors.textPrimary,
    },
    caption: {
      marginTop: 4,
      fontSize: 13.5,
      lineHeight: 21,
      color: Colors.textSecondary,
    },
    ctaCol: { gap: 8 },
    cta: {
      minHeight: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.primary,
    },
    ctaText: { fontSize: 14, fontWeight: "700", color: Colors.onPrimary },
    ctaGhost: {
      minHeight: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surfaceAlt,
    },
    ctaGhostText: {
      fontSize: 14,
      fontWeight: "600",
      color: Colors.primaryText,
    },
    controls: { flexDirection: "row", alignItems: "center", gap: 8 },
    ctrl: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surfaceAlt,
    },
    sceneLink: {
      minHeight: 36,
      borderRadius: 18,
      paddingHorizontal: 14,
      justifyContent: "center",
      backgroundColor: Colors.primaryLight,
    },
    sceneLinkText: {
      fontSize: 13,
      fontWeight: "600",
      color: Colors.primaryText,
    },

    center: { alignItems: "center", justifyContent: "center" },
    stageTitle: {
      marginTop: 10,
      fontSize: 24,
      fontWeight: "700",
      color: onStage,
    },
    chipGrid: {
      marginTop: 14,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      maxWidth: 300,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minWidth: 88,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    chipText: { fontSize: 12, fontWeight: "600", color: onStage },
    tick: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    stepText: { fontSize: 21, fontWeight: "700", color: onStage },
    stageSmall: {
      marginTop: 14,
      fontSize: 12,
      fontWeight: "500",
      color: onStage,
      opacity: 0.85,
    },

    phone: {
      width: "100%",
      maxWidth: 290,
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
      shadowColor: "#0A0828",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.35,
      shadowRadius: 30,
      elevation: 10,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: Colors.surfaceAlt,
    },
    expense: {
      marginTop: 10,
      flexDirection: "column",
      alignItems: "stretch",
      gap: 2,
    },
    label: {
      fontSize: 10.5,
      fontWeight: "600",
      letterSpacing: 0.6,
      color: Colors.textMuted,
    },
    big: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
    score: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
    cardTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
    rowText: { fontSize: 12.5, fontWeight: "500", color: Colors.textPrimary },
    rowStrong: {
      fontSize: 12.5,
      fontWeight: "600",
      color: Colors.textPrimary,
    },
    muted10: { fontSize: 10.5, color: Colors.textMuted },
    muted12: { fontSize: 11.5, color: Colors.textMuted },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    pillText: { fontSize: 11, fontWeight: "600" },
    dot: { width: 9, height: 9, borderRadius: 5 },
    stackTrack: {
      marginTop: 10,
      height: 13,
      borderRadius: 7,
      overflow: "hidden",
      flexDirection: "row",
      backgroundColor: Colors.surfaceAlt,
    },
    track: {
      marginTop: 4,
      height: 7,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: Colors.surfaceAlt,
    },
    trackFill: { height: "100%", borderRadius: 4 },
    entryIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.primaryLight,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: Colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
    billRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: Colors.warningLight,
    },
  };
});
