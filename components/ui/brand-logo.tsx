import { cn } from "@/lib/cn";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  size?: "header" | "nav";
};

const sizeClasses = {
  header: "h-14 w-auto sm:h-16",
  nav: "h-6 w-auto sm:h-7",
};

export function BrandLogo({
  className,
  size = "header",
}: BrandLogoProps) {
  const isNav = size === "nav";
  return (
    <span className={cn("inline-flex items-center gap-2", sizeClasses[size], className)}>
      <svg width={isNav ? "24" : "34"} height={isNav ? "24" : "34"} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#534AB7" />
        <circle cx="32" cy="32" r="18" fill="none" stroke="#EEEDFE" strokeWidth="2" opacity="0.4" />
        <text x="32" y="39" textAnchor="middle" fontFamily="system-ui" fontWeight="800" fontSize="20" fill="#FFFFFF">
          FK
        </text>
      </svg>
      <span className={isNav ? "text-base font-bold text-[#534AB7]" : "text-xl font-bold text-[#534AB7]"}>
        Finkoin
      </span>
    </span>
  );
}
