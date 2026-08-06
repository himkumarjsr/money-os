/**
 * App-wide line icons matching web `components/ui/AppIcon.tsx`.
 * Stroke color defaults to Finkoin purple #534AB7.
 */
import Svg, { Path, Circle, Rect, G } from "react-native-svg";
import { Colors } from "@/constants/theme";

export const APP_ICON_COLOR = Colors.primary;

export type AppIconName =
  | "trending"
  | "wallet"
  | "users"
  | "receipt"
  | "bank"
  | "briefcase"
  | "chart"
  | "home"
  | "notebook"
  | "doc"
  | "user"
  | "settings"
  | "coin"
  | "shield"
  | "flame"
  | "calculator"
  | "bell"
  | "bulb"
  | "logout"
  | "gift"
  | "trophy"
  | "target";

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function IconPaths({ name }: { name: AppIconName }) {
  switch (name) {
    case "trending":
      return (
        <>
          <Path d="M4 16l5-5 4 3 6-7" />
          <Path d="M15 7h4v4" />
        </>
      );
    case "wallet":
      return (
        <>
          <Path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
          <Path d="M3 8l2-4h14l2 4" />
          <Path d="M16 13h2" />
        </>
      );
    case "users":
      return (
        <>
          <Circle cx="9" cy="8" r="3.2" />
          <Path d="M3.5 19c1-2.6 3-4 5.5-4s4.5 1.4 5.5 4" />
          <Path d="M16 5.5a3 3 0 0 1 0 5.8" />
          <Path d="M17.5 15c2 .4 3.4 1.7 4 4" />
        </>
      );
    case "receipt":
      return (
        <>
          <Path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3z" />
          <Path d="M9 8h6M9 12h6" />
        </>
      );
    case "bank":
      return (
        <>
          <Path d="M4 10l8-5 8 5" />
          <Path d="M6 10v7M10 10v7M14 10v7M18 10v7M4 17h16" />
        </>
      );
    case "briefcase":
      return (
        <>
          <Rect x="3" y="8" width="18" height="12" rx="2" />
          <Path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
        </>
      );
    case "chart":
      return <Path d="M5 19V10M10 19V6M15 19v-7M20 19V8" />;
    case "home":
      return (
        <>
          <Path d="M4 11l8-7 8 7" />
          <Path d="M6 10v9h12v-9" />
        </>
      );
    case "notebook":
      return (
        <>
          <Rect x="6" y="3" width="13" height="18" rx="2" />
          <Path d="M6 8h13M6 12h13M6 16h8" />
          <Path d="M3 6h3M3 10h3M3 14h3" />
        </>
      );
    case "doc":
      return (
        <>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <Path d="M14 2v6h6" />
        </>
      );
    case "flame":
      return (
        <Path d="M12 3c-1 4 3 5 3 9a5 5 0 1 1-10 0c0-2 2-4 3-6 0 2 1 3 2 3.5C10 8 11 5 12 3z" />
      );
    case "calculator":
      return (
        <>
          <Rect x="4" y="3" width="16" height="18" rx="2" />
          <Path d="M8 8h8M8 12h8M8 16h5" />
        </>
      );
    case "user":
      return (
        <>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4 20c1.2-3.3 4.3-5 8-5s6.8 1.7 8 5" />
        </>
      );
    case "settings":
      return (
        <>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </>
      );
    case "coin":
      return (
        <>
          <Circle cx="12" cy="12" r="8" />
          <Path d="M12 8v8M10 10.5c.5-.8 1.2-1 2-1s1.5.4 1.5 1.2c0 1.6-3.5 1-3.5 3 0 .8.7 1.3 2 1.3s1.6-.3 2-1" />
        </>
      );
    case "shield":
      return <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />;
    case "bell":
      return (
        <>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      );
    case "bulb":
      return (
        <>
          <Path d="M9 18h6M10 22h4" />
          <Path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </>
      );
    case "logout":
      return (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Path d="M16 17l5-5-5-5M21 12H9" />
        </>
      );
    case "gift":
      return (
        <>
          <Rect x="3" y="8" width="18" height="13" rx="1" />
          <Path d="M12 8v13M3 12h18M12 8c0-2 1.5-4 3.5-4S19 6 19 8M12 8c0-2-1.5-4-3.5-4S5 6 5 8" />
        </>
      );
    case "trophy":
      return (
        <>
          <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
          <Path d="M7 6H4a2 2 0 0 0 2 4M17 6h3a2 2 0 0 1-2 4" />
        </>
      );
    case "target":
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Circle cx="12" cy="12" r="5" />
          <Circle cx="12" cy="12" r="1.5" />
        </>
      );
    default:
      return null;
  }
}

export function AppIcon({
  name,
  size = 20,
  color = APP_ICON_COLOR,
  strokeWidth = 1.75,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <IconPaths name={name} />
      </G>
    </Svg>
  );
}
