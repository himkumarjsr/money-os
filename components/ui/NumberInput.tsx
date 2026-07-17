"use client";

import { useEffect, useRef, useState } from "react";

interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  helper?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export default function NumberInput({
  label,
  value,
  onChange,
  placeholder = "0",
  helper,
  suffix,
  min = 0,
  max,
  step = 0.01,
  disabled = false,
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (focused) return;
    setDraft(value === 0 ? "" : String(value));
  }, [value, focused]);

  const parseAndClamp = (raw: string): number => {
    if (raw === "" || raw === ".") return 0;
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return 0;
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (step > 0 && step < 1) {
      const decimals = Math.min(6, (String(step).split(".")[1] || "").length);
      next = Number(next.toFixed(decimals));
    }
    return next;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
    setDraft(raw);
    if (raw === "" || raw === "." || raw.endsWith(".")) return;
    onChange(parseAndClamp(raw));
  };

  return (
    <div style={{ width: "100%" }}>
      {label ? (
        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 500,
            color: "#5F5E5A",
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: focused ? "1.5px solid #534AB7" : "1.5px solid #E8E6F0",
          borderRadius: 10,
          background: disabled ? "#F7F7F4" : "white",
          height: 48,
          paddingLeft: 14,
          paddingRight: 14,
          gap: 6,
          boxShadow: focused ? "0 0 0 3px rgba(83,74,183,0.1)" : "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          cursor: disabled ? "not-allowed" : "text",
        }}
        onClick={() => {
          if (disabled || !inputRef.current) return;
          inputRef.current.focus();
          inputRef.current.select();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={handleChange}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setFocused(false);
            const next = parseAndClamp(draft);
            onChange(next);
            setDraft(next === 0 ? "" : String(next));
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 18,
            lineHeight: 1.3,
            fontWeight: draft ? 600 : 400,
            color: draft ? "#111110" : "#9B9A94",
            fontFamily: "inherit",
          }}
        />
        {suffix ? (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#534AB7",
              flexShrink: 0,
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>

      {helper ? (
        <p
          style={{
            fontSize: 12,
            color: "#9B9A94",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}
