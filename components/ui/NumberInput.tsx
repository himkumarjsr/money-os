"use client";

import { useState } from "react";

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
  step = 0.1,
  disabled = false,
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === ".") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      if (max !== undefined) {
        onChange(Math.min(parsed, max));
      } else {
        onChange(parsed);
      }
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {label && (
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
      )}

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
      >
        <input
          type="number"
          value={value === 0 ? "" : value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 16,
            fontWeight: value > 0 ? 600 : 400,
            color: value > 0 ? "#111110" : "#9B9A94",
            fontFamily: "inherit",
            appearance: "textfield",
            MozAppearance: "textfield",
            WebkitAppearance: "none",
          }}
        />
        {suffix && (
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
        )}
      </div>

      {helper && (
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
      )}
    </div>
  );
}
