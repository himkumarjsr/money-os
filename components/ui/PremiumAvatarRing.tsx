import type { ReactNode } from "react";

type Props = {
  /** Draw the gold ring; otherwise children render unchanged. */
  premium: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * 2px gold gradient ring around a circular avatar for Premium (Finkoin)
 * members. Inline colours so `app/theme.css` never remaps them.
 */
export default function PremiumAvatarRing({
  premium,
  children,
  className,
}: Props) {
  if (!premium) return <>{children}</>;
  return (
    <span
      className={["inline-flex shrink-0 rounded-full", className ?? ""]
        .join(" ")
        .trim()}
      style={{
        padding: 2,
        background: "linear-gradient(135deg, #F5D77A 0%, #C9A13B 100%)",
      }}
    >
      {children}
    </span>
  );
}
