import type { ReactNode } from "react";

/**
 * App-wide, theme-coloured line icons. All strokes use `currentColor` by
 * default so an icon inherits the surrounding text colour; pass `color` to
 * force the Finkoin purple. Mirrors the style of `components/tracker/TrackerIcons`.
 *
 * Keep the Indian flag (🇮🇳) as an emoji everywhere — it is intentionally not
 * represented here.
 */

export const APP_ICON_COLOR = "#534AB7";

export type AppIconName =
  | "user"
  | "users"
  | "notebook"
  | "chart"
  | "trending"
  | "shield"
  | "target"
  | "trophy"
  | "gift"
  | "settings"
  | "logout"
  | "coin"
  | "flame"
  | "bell"
  | "lock"
  | "lockOpen"
  | "home"
  | "wallet"
  | "plane"
  | "party"
  | "alert"
  | "trash"
  | "mail"
  | "sparkle"
  | "robot"
  | "sunrise"
  | "lifebuoy"
  | "doc"
  | "receipt"
  | "rupee"
  | "pencil"
  | "check"
  | "checkCircle"
  | "close"
  | "heart"
  | "star"
  | "bank"
  | "hospital"
  | "bulb"
  | "download"
  | "speaker"
  | "mute"
  | "repeat"
  | "briefcase"
  | "beach"
  | "phone"
  | "card"
  | "chevronDown"
  | "chevronRight"
  | "calendar";

const paths: Record<AppIconName, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.2-3.3 4.3-5 8-5s6.8 1.7 8 5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c1-2.6 3-4 5.5-4s4.5 1.4 5.5 4" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M17.5 15c2 .4 3.4 1.7 4 4" />
    </>
  ),
  notebook: (
    <>
      <rect x="6" y="3" width="13" height="18" rx="2" />
      <path d="M6 8h13M6 12h13M6 16h8" />
      <path d="M3 6h3M3 10h3M3 14h3" />
    </>
  ),
  chart: <path d="M5 19V10M10 19V6M15 19v-7M20 19V8" />,
  trending: (
    <>
      <path d="M4 16l5-5 4 3 6-7" />
      <path d="M15 7h4v4" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M10 13v3M14 13v3M8 20h8M9 20l1-4h4l1 4" />
    </>
  ),
  gift: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="1" />
      <path d="M5 13h14M12 10v10M9 7c0-1.5 1.2-2.5 3-1.5C13.8 4.5 15 5.5 15 7c0 1.5-3 3-3 3s-3-1.5-3-3z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
      <path d="M16 8l4 4-4 4M20 12H9" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M10 10.5c.5-.8 1.2-1 2-1s1.5.4 1.5 1.2c0 1.6-3.5 1-3.5 3 0 .8.7 1.3 2 1.3s1.6-.3 2-1" />
    </>
  ),
  flame: (
    <path d="M12 3c-1 4 3 5 3 9a5 5 0 1 1-10 0c0-2 2-4 3-6 0 2 1 3 2 3.5C10 8 11 5 12 3z" />
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  lockOpen: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </>
  ),
  home: (
    <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
  ),
  wallet: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  plane: <path d="M4 14l7-2 8-6 1 1-5 6 4 1-3 2-4-1-3 3-2-1 2-4-5-1z" />,
  party: (
    <>
      <path d="M6 18l4-10 8 3-4 10-8-3z" />
      <path d="M14 5l1 3M18 7l2 2M16 3v2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 15H3L12 4z" />
      <path d="M12 10v4M12 16.5v.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 4l1.2 4.2L17.5 9.5 13.2 11 12 15.5 10.8 11 6.5 9.5l4.3-1.3L12 4z" />
      <path d="M18 14l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2z" />
    </>
  ),
  robot: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="2" />
      <path d="M12 4v4M9 13h.01M15 13h.01M9 18v2M15 18v2" />
      <circle cx="12" cy="4" r="1" />
    </>
  ),
  sunrise: (
    <>
      <path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0" />
      <path d="M12 4v3M4.5 8.5l1.5 1.5M19.5 8.5L18 10" />
    </>
  ),
  lifebuoy: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M5.5 5.5l3.2 3.2M15.3 15.3l3.2 3.2M18.5 5.5l-3.2 3.2M8.7 15.3l-3.2 3.2" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5M9 13h6M9 16h6" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  rupee: (
    <>
      <path d="M7 5h10M7 9h10M15 5c0 4-3.5 5-6 5l6 6" />
      <path d="M7 10h3" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  check: <path d="M5 12l4.5 4.5L19 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  heart: (
    <path d="M12 20s-7-4.5-7-9.5A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.5C19 15.5 12 20 12 20z" />
  ),
  star: (
    <path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.8 6.99 19l1.2-5.6L4 9.6 9.6 9 12 4z" />
  ),
  bank: (
    <>
      <path d="M4 10l8-5 8 5" />
      <path d="M6 10v7M10 10v7M14 10v7M18 10v7M4 17h16" />
    </>
  ),
  hospital: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 10l4 4M20 10l-4 4" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 9a5 5 0 0 1 5-5h7l-2-2M20 15a5 5 0 0 1-5 5H8l2 2" />
      <path d="M16 2l2 2-2 2M8 22l-2-2 2-2" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  beach: (
    <>
      <path d="M3 20h18" />
      <path d="M12 20V9M12 9c-3-3-6-2-8 1 3-1 5 0 8-1zM12 9c2-3 5-3 8-1-3-1-6 0-8 1z" />
      <circle cx="17" cy="6" r="2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 14h4" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </>
  ),
};

export function AppIcon({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.75,
  className,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <g
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </g>
    </svg>
  );
}

export function AppIconBadge({
  name,
  size = 40,
  iconSize = 20,
  color = APP_ICON_COLOR,
  radius = 12,
}: {
  name: AppIconName;
  size?: number;
  iconSize?: number;
  color?: string;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${color}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <AppIcon name={name} size={iconSize} color={color} />
    </div>
  );
}
