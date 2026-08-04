import { useMemo } from "react";
import { Input } from "./Input";
import { formatIndian, parseIndianInput } from "@/lib/formatters";
import type { TextInputProps } from "react-native";

type Props = Omit<TextInputProps, "value" | "onChangeText"> & {
  label?: string;
  value: number | null | undefined;
  onChangeValue: (n: number | null) => void;
  error?: string;
};

/** Money field with Indian grouping display. */
export function MoneyInput({
  label,
  value,
  onChangeValue,
  error,
  ...rest
}: Props) {
  const display = useMemo(() => {
    if (value == null || !Number.isFinite(value) || value === 0) return "";
    return formatIndian(value);
  }, [value]);

  return (
    <Input
      label={label}
      error={error}
      keyboardType="decimal-pad"
      value={display}
      onChangeText={(raw) => {
        if (!raw.trim()) {
          onChangeValue(null);
          return;
        }
        const parsed = parseIndianInput(raw);
        onChangeValue(parsed);
      }}
      {...rest}
    />
  );
}
