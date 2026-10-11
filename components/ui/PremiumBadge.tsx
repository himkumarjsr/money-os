type Props = {
  size?: "sm" | "md";
  className?: string;
};

const SIZES = {
  sm: { fontSize: 10, padding: "1px 6px", gap: 3, glyph: 9 },
  md: { fontSize: 12, padding: "2px 8px", gap: 4, glyph: 11 },
} as const;

/**
 * Small gold "Premium" pill for Premium (Finkoin) members. Colours are inline
 * so `app/theme.css` never remaps them: it reads the same in light, dark and
 * the gold theme.
 */
export default function PremiumBadge({ size = "md", className }: Props) {
  const s = SIZES[size];
  return (
    <span
      className={["inline-flex shrink-0 items-center", className ?? ""]
        .join(" ")
        .trim()}
      style={{
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        lineHeight: 1.4,
        fontWeight: 700,
        letterSpacing: 0.2,
        borderRadius: 999,
        color: "#2A1F05",
        background: "linear-gradient(135deg, #F5D77A 0%, #C9A13B 100%)",
        boxShadow: "inset 0 0 0 1px rgba(138, 106, 30, 0.35)",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      <svg
        width={s.glyph}
        height={s.glyph}
        viewBox="0 0 24 24"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        {/* Crown */}
        <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" fill="currentColor" />
      </svg>
      Premium
    </span>
  );
}
