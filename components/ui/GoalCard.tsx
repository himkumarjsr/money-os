"use client";

import { cn } from "@/lib/cn";

type Props = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: (id: string) => void;
};

export default function GoalCard({ id, icon, title, subtitle, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "rounded-2xl border p-4 text-left transition-colors",
        selected ? "border-[#534AB7] bg-[#EEEDFE]" : "border-[#E8E6F0] bg-white hover:border-[#C9C5EA]",
      )}
    >
      <div className="text-xl">{icon}</div>
      <p className="mt-2 text-sm font-semibold text-[#111110]">{title}</p>
      <p className="mt-1 text-xs text-[#7A7871]">{subtitle}</p>
    </button>
  );
}
