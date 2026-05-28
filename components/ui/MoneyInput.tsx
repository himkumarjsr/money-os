"use client";

import { formatIndian, formatInWords, handleMoneyInput } from "@/lib/formatters";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from "react";

type MoneyInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  /** Shown on the right of the label row (e.g. tax teach ? tooltip) */
  labelAction?: ReactNode;
  error?: string;
  helper?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  min?: number | string;
  max?: number | string;
};

const FIELD_HELPER = "text-xs text-slate-500";

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    id,
    label,
    labelAction,
    error,
    helper,
    required,
    optional,
    hint,
    placeholder = "0",
    min = 0,
    max = 10000000,
    onChange,
    onBlur,
    onFocus,
    ...inputProps
  },
  ref,
) {
  const minValue = Number(min ?? 0);
  const maxValue = Math.min(Number(max ?? 10000000), 10000000);

  const innerRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [words, setWords] = useState("");

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
      const registerRef = (inputProps as { ref?: Ref<HTMLInputElement> }).ref;
      if (typeof registerRef === "function") registerRef(node);
      else if (registerRef && typeof registerRef === "object") {
        (registerRef as MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [inputProps, ref],
  );

  const updateWords = useCallback((raw: string) => {
    const parsed = handleMoneyInput(raw, minValue, maxValue);
    if (parsed === null || parsed <= 0) {
      setWords("");
      return;
    }
    setWords(formatInWords(parsed));
  }, [maxValue, minValue]);

  useEffect(() => {
    if (!innerRef.current || isFocused) return;
    const raw = innerRef.current.value ?? "";
    const parsed = handleMoneyInput(raw, minValue, maxValue);
    if (parsed !== null && parsed > 0) {
      innerRef.current.value = formatIndian(parsed);
      setWords(formatInWords(parsed));
    } else {
      setWords("");
    }
  }, [isFocused, maxValue, minValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWords(e.target.value);
    onChange?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    const parsed = handleMoneyInput(e.currentTarget.value, minValue, maxValue);
    e.currentTarget.value = parsed !== null && parsed > 0 ? String(parsed) : "";
    e.currentTarget.select();
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const parsed = handleMoneyInput(e.currentTarget.value, minValue, maxValue);
    if (parsed !== null && parsed > 0) {
      e.currentTarget.value = formatIndian(parsed);
      setWords(formatInWords(parsed));
    } else {
      e.currentTarget.value = "";
      setWords("");
    }
    onBlur?.(e);
  };

  const helperText = useMemo(() => hint ?? helper, [helper, hint]);
  const { ref: _registerRef, ...nativeInputProps } = inputProps as typeof inputProps & {
    ref?: Ref<HTMLInputElement>;
  };

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <label htmlFor={id} className="min-w-0 flex-1 text-sm font-medium text-[#5F5E5A]">
          {label}
          {required ? <span className="text-[#E24B4A]"> *</span> : null}
          {optional ? (
            <span className="ml-1.5 text-[11px] font-normal text-[#9B9A94]">optional</span>
          ) : null}
        </label>
        {labelAction ? <span className="shrink-0 pt-0.5">{labelAction}</span> : null}
      </div>

      <div
        className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 transition-[border-color,background-color] ${
          isFocused
            ? "border-[1.5px] border-[#534AB7] bg-[#FAFAFE]"
            : "border border-[#E8E6F0] bg-white"
        }`}
        onClick={() => {
          if (!innerRef.current || nativeInputProps.disabled) return;
          innerRef.current.focus();
          innerRef.current.select();
        }}
      >
        <span className="shrink-0 text-base font-semibold text-[#534AB7]">₹</span>
        <input
          ref={setRefs}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent text-[18px] font-semibold leading-snug text-[#111110] outline-none placeholder:text-slate-400"
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...nativeInputProps}
        />
        {innerRef.current?.value ? (
          <button
            type="button"
            onClick={() => {
              if (!innerRef.current) return;
              innerRef.current.value = "";
              setWords("");
            }}
            className="text-xs font-medium text-[#9B9A94] hover:text-[#5F5E5A]"
          >
            Clear
          </button>
        ) : null}
      </div>

      {words ? <div className="mt-1 pl-1 text-xs text-[#9B9A94]">₹{words}</div> : null}
      {helperText ? <p className={`${FIELD_HELPER} mt-1 pl-1`}>{helperText}</p> : null}
      {error ? <p className="mt-1 text-sm text-[#E24B4A]">{error}</p> : null}
    </div>
  );
});

export default MoneyInput;

