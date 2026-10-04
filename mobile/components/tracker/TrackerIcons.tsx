/**
 * Tracker category/subcategory icons — ports web `components/tracker/TrackerIcons.tsx`
 * shapes 1:1 onto react-native-svg so bucket + subcategory rows match the PWA visually.
 */
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Rect, G } from "react-native-svg";
import {
  TRACKER_ICON_COLOR,
  type TrackerIconName,
} from "@/lib/tracker-categories";

type IconShape = {
  d?: string[];
  circles?: Array<{ cx: number; cy: number; r: number; filled?: boolean }>;
  rects?: Array<{ x: number; y: number; w: number; h: number; rx?: number }>;
};

const shapes: Record<TrackerIconName, IconShape> = {
  home: { d: ["M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"] },
  cart: {
    d: ["M6 6h2l1.2 9h9.3l1.5-6H8.2"],
    circles: [
      { cx: 10, cy: 19, r: 1.2 },
      { cx: 17, cy: 19, r: 1.2 },
    ],
  },
  leaf: { d: ["M5 19c8-1 12-7 13-14-7 1-13 5-13 14zM5 19c3-3 7-5 12-6"] },
  milk: { d: ["M8 8h8v12H8zM9 5h6l1 3H8l1-3z"] },
  bolt: { d: ["M13 3L6 13h5l-1 8 8-12h-5l1-6z"] },
  droplet: { d: ["M12 3c0 0-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"] },
  flame: {
    d: ["M12 3c-1 4 3 5 3 9a5 5 0 1 1-10 0c0-2 2-4 3-6 0 2 1 3 2 3.5C10 8 11 5 12 3z"],
  },
  wifi: {
    d: [
      "M4.5 10.5a10 10 0 0 1 15 0",
      "M7.5 13.5a6 6 0 0 1 9 0",
      "M10.5 16.5a2 2 0 0 1 3 0",
    ],
    circles: [{ cx: 12, cy: 19, r: 1, filled: true }],
  },
  phone: { d: ["M11 18h2"], rects: [{ x: 8, y: 3, w: 8, h: 18, rx: 2 }] },
  graduation: {
    d: ["M3 10l9-5 9 5-9 5-9-5z", "M7 12v4c2 1.5 8 1.5 10 0v-4", "M21 10v6"],
  },
  pill: {
    d: ["M9.5 4.5a4 4 0 0 1 5.5 5.5L9.5 15.5A4 4 0 1 1 4 10l5.5-5.5z", "M9 10l5 5"],
  },
  hospital: {
    d: ["M12 8v8M8 12h8"],
    rects: [{ x: 5, y: 4, w: 14, h: 16, rx: 1.5 }],
  },
  broom: {
    d: ["M8 14l6-6", "M12.5 9.5l3 3", "M5 19c2-1 4-2 6-1l-2 3H5v-2z", "M14 4l6 6"],
  },
  fuel: {
    d: ["M14 9h2.5a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2", "M8 9h3"],
    rects: [{ x: 5, y: 5, w: 9, h: 15, rx: 1.5 }],
  },
  cab: {
    d: ["M4 15l1.5-5a2 2 0 0 1 2-1.5h9a2 2 0 0 1 2 1.5L20 15", "M4 15h16v3H4z", "M9 11h6"],
    circles: [
      { cx: 7.5, cy: 18.5, r: 1.5 },
      { cx: 16.5, cy: 18.5, r: 1.5 },
    ],
  },
  auto: {
    d: ["M5 16l1.2-4.5A2 2 0 0 1 8.1 10h6.2a2 2 0 0 1 1.9 1.4L18 16", "M5 16h14v2.5H5z", "M10 8h3l1 2"],
    circles: [
      { cx: 8, cy: 19, r: 1.4 },
      { cx: 16, cy: 19, r: 1.4 },
    ],
  },
  transit: {
    d: ["M6 12h12", "M9 18v2M15 18v2"],
    rects: [{ x: 6, y: 4, w: 12, h: 14, rx: 2 }],
    circles: [
      { cx: 9, cy: 15.5, r: 1, filled: true },
      { cx: 15, cy: 15.5, r: 1, filled: true },
    ],
  },
  utensils: {
    d: ["M8 4v7a2 2 0 0 0 2 2v7", "M8 4c0 2 .5 3.5 1.5 4", "M16 4v16M16 4c2 2 2 5 0 7"],
  },
  coffee: {
    d: [
      "M6 9h10v5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9z",
      "M16 10h1.5a2.5 2.5 0 0 1 0 5H16",
      "M8 5c.5 1 .5 2 0 3M11 5c.5 1 .5 2 0 3",
    ],
  },
  snack: { d: ["M5 14c2-4 12-4 14 0-1 4-5 6-7 6s-6-2-7-6z", "M8 10c1-2 7-2 8 0"] },
  film: {
    d: ["M8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4"],
    rects: [{ x: 4, y: 6, w: 16, h: 12, rx: 2 }],
  },
  game: {
    d: [
      "M6 10h12a3 3 0 0 1 3 3v2a4 4 0 0 1-4 4h-2l-2-2h-2l-2 2H7a4 4 0 0 1-4-4v-2a3 3 0 0 1 3-3z",
      "M8.5 13.5h3M10 12v3",
    ],
    circles: [
      { cx: 15.5, cy: 13, r: 0.8, filled: true },
      { cx: 17.5, cy: 15, r: 0.8, filled: true },
    ],
  },
  shirt: { d: ["M9 5l3 2 3-2 3 2v3l-2-1v10H8V9L6 10V7l3-2z"] },
  device: { d: ["M11 18h2"], rects: [{ x: 7, y: 3, w: 10, h: 18, rx: 2 }] },
  sparkle: {
    d: [
      "M12 4l1.2 4.2L17.5 9.5 13.2 11 12 15.5 10.8 11 6.5 9.5l4.3-1.3L12 4z",
      "M18 14l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2z",
    ],
  },
  dumbbell: { d: ["M6 10v4M8 9v6M16 9v6M18 10v4M8 12h8"] },
  plane: { d: ["M4 14l7-2 8-6 1 1-5 6 4 1-3 2-4-1-3 3-2-1 2-4-5-1z"] },
  gift: {
    d: ["M5 13h14M12 10v10M9 7c0-1.5 1.2-2.5 3-1.5C13.8 4.5 15 5.5 15 7c0 1.5-3 3-3 3s-3-1.5-3-3z"],
    rects: [{ x: 5, y: 10, w: 14, h: 10, rx: 1 }],
  },
  music: {
    d: ["M9 18V7l10-2v11"],
    circles: [
      { cx: 7, cy: 18, r: 2 },
      { cx: 17, cy: 16, r: 2 },
    ],
  },
  package: { d: ["M4 8l8-4 8 4v10l-8 4-8-4V8z", "M4 8l8 4 8-4M12 12v10"] },
  cigarette: {
    d: ["M3 14h12v3H3zM15 14h3v3h-3zM18 14h2l1-2", "M19 9c0 1 .5 2 .5 3M21 8c0 1.2.5 2.2.5 3.5"],
  },
  drink: { d: ["M8 4h8l-1 14H9L8 4z", "M7 4h10", "M10 10h4"] },
  herb: { d: ["M12 20c0-8 6-10 6-16-6 2-8 8-8 16 0-8-2-14-8-16 0 6 6 8 6 16h4z"] },
  dice: {
    rects: [{ x: 5, y: 5, w: 14, h: 14, rx: 2 }],
    circles: [
      { cx: 9, cy: 9, r: 1, filled: true },
      { cx: 15, cy: 9, r: 1, filled: true },
      { cx: 12, cy: 12, r: 1, filled: true },
      { cx: 9, cy: 15, r: 1, filled: true },
      { cx: 15, cy: 15, r: 1, filled: true },
    ],
  },
  card: {
    d: ["M3 10h18", "M7 14h4"],
    rects: [{ x: 3, y: 6, w: 18, h: 12, rx: 2 }],
  },
  car: {
    d: ["M4 14l1.5-4.5A2 2 0 0 1 7.4 8h9.2a2 2 0 0 1 1.9 1.5L20 14", "M4 14h16v3H4z"],
    circles: [
      { cx: 7.5, cy: 17.5, r: 1.5 },
      { cx: 16.5, cy: 17.5, r: 1.5 },
    ],
  },
  wallet: {
    d: ["M3 10h18"],
    rects: [{ x: 3, y: 7, w: 18, h: 12, rx: 2 }],
    circles: [{ cx: 16, cy: 14, r: 1.2, filled: true }],
  },
  bike: {
    d: ["M6.5 16.5l3.5-7h3l4.5 7M10 9.5h4M12.5 9.5V8"],
    circles: [
      { cx: 6.5, cy: 16.5, r: 2.5 },
      { cx: 17.5, cy: 16.5, r: 2.5 },
    ],
  },
  calendar: {
    d: ["M8 3v4M16 3v4M4 11h16"],
    rects: [{ x: 4, y: 6, w: 16, h: 14, rx: 2 }],
  },
  chart: { d: ["M5 19V10M10 19V6M15 19v-7M20 19V8"] },
  bank: { d: ["M4 10l8-5 8 5", "M6 10v7M10 10v7M14 10v7M18 10v7M4 17h16"] },
  shield: { d: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"] },
  coin: {
    d: ["M12 8v8M10 10.5c.5-.8 1.2-1 2-1s1.5.4 1.5 1.2c0 1.6-3.5 1-3.5 3 0 .8.7 1.3 2 1.3s1.6-.3 2-1"],
    circles: [{ cx: 12, cy: 12, r: 8 }],
  },
  briefcase: {
    d: ["M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"],
    rects: [{ x: 3, y: 8, w: 18, h: 12, rx: 2 }],
  },
  laptop: {
    d: ["M3 17h18l-2-2H5l-2 2z"],
    rects: [{ x: 5, y: 5, w: 14, h: 10, rx: 1.5 }],
  },
  building: {
    d: ["M9 8h2M13 8h2M9 12h2M13 12h2M9 16h6"],
    rects: [{ x: 6, y: 4, w: 12, h: 16, rx: 1 }],
  },
  trending: { d: ["M4 16l5-5 4 3 6-7", "M15 7h4v4"] },
  alert: { d: ["M12 4l9 15H3L12 4z", "M12 10v4M12 16.5v.5"] },
  party: { d: ["M6 18l4-10 8 3-4 10-8-3z", "M14 5l1 3M18 7l2 2M16 3v2"] },
  other: {
    circles: [
      { cx: 7, cy: 12, r: 1.3, filled: true },
      { cx: 12, cy: 12, r: 1.3, filled: true },
      { cx: 17, cy: 12, r: 1.3, filled: true },
    ],
  },
};

export function TrackerIcon({
  name,
  size = 20,
  color = TRACKER_ICON_COLOR,
}: {
  name: TrackerIconName;
  size?: number;
  color?: string;
}) {
  const s = shapes[name] ?? shapes.other;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {(s.rects ?? []).map((r, i) => (
          <Rect
            key={`r${i}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={r.rx ?? 0}
          />
        ))}
        {(s.d ?? []).map((d, i) => (
          <Path key={i} d={d} />
        ))}
        {(s.circles ?? []).map((c, i) => (
          <Circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={c.filled ? color : "none"}
            stroke={c.filled ? "none" : color}
          />
        ))}
      </G>
    </Svg>
  );
}

export function TrackerIconBadge({
  name,
  size = 40,
  iconSize = 20,
  color = TRACKER_ICON_COLOR,
}: {
  name: TrackerIconName;
  size?: number;
  iconSize?: number;
  color?: string;
}) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, backgroundColor: `${color}14` },
      ]}
    >
      <TrackerIcon name={name} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
