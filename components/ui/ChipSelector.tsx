"use client";

import { cn } from "@/lib/cn";

type Option = { id: string; label: string; icon?: string };
type Props = {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export default function ChipSelector({ options, selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() =>
              onChange(
                isActive ? selected.filter((s) => s !== option.id) : [...selected, option.id],
              )
            }
            className={cn(
              "rounded-full border px-3 py-2 text-sm transition-colors",
              isActive ? "border-[#534AB7] bg-[#EEEDFE] text-[#3C3489]" : "border-[#D9D7E5] bg-white text-[#5F5E5A]",
            )}
          >
            {option.icon ? `${option.icon} ` : ""}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
