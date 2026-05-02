"use client";

import { useCallback, useState } from "react";

function formatDisplay(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  if (Math.abs(n) >= 1e12) return n.toExponential(6);
  const s = String(n);
  if (s.length > 14) return Number(n.toPrecision(12)).toString();
  return s;
}

function compute(a: number, b: number, op: string): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  const read = useCallback(() => {
    const v = parseFloat(display);
    return Number.isFinite(v) ? v : 0;
  }, [display]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setStored(null);
    setPendingOp(null);
    setFresh(false);
  }, []);

  const inputDigit = useCallback(
    (d: string) => {
      if (fresh) {
        setDisplay(d === "." ? "0." : d);
        setFresh(false);
        return;
      }
      if (d === "." && display.includes(".")) return;
      if (display === "Error") {
        setDisplay(d === "." ? "0." : d);
        return;
      }
      setDisplay((cur) => {
        if (cur === "0" && d !== ".") return d;
        return cur + d;
      });
    },
    [display, fresh],
  );

  const backspace = useCallback(() => {
    setDisplay((cur) => {
      if (cur.length <= 1) return "0";
      return cur.slice(0, -1);
    });
    setFresh(false);
  }, []);

  const negate = useCallback(() => {
    if (display === "Error") return;
    const v = read();
    setDisplay(formatDisplay(-v));
    setFresh(false);
  }, [display, read]);

  const pickOp = useCallback(
    (next: string) => {
      if (display === "Error") return;
      const cur = read();
      if (stored !== null && pendingOp && !fresh) {
        const res = compute(stored, cur, pendingOp);
        if (!Number.isFinite(res)) {
          setDisplay("Error");
          setStored(null);
          setPendingOp(null);
          setFresh(false);
          return;
        }
        setStored(res);
        setDisplay(formatDisplay(res));
      } else {
        setStored(cur);
      }
      setPendingOp(next);
      setFresh(true);
    },
    [display, fresh, pendingOp, read, stored],
  );

  const equals = useCallback(() => {
    if (display === "Error" || stored === null || !pendingOp || fresh) return;
    const cur = read();
    const res = compute(stored, cur, pendingOp);
    setDisplay(Number.isFinite(res) ? formatDisplay(res) : "Error");
    setStored(null);
    setPendingOp(null);
    setFresh(true);
  }, [display, fresh, pendingOp, read, stored]);

  const btn =
    "flex h-14 items-center justify-center rounded-2xl text-lg font-semibold active:scale-[0.97] transition select-none touch-manipulation";

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6 md:pb-10">
      <h1 className="mb-1 text-center text-sm font-semibold uppercase tracking-wide text-[#534AB7]">Calculator</h1>
      <p className="mb-6 text-center text-xs text-slate-500">Quick sums — not tax or SIP tools</p>

      <div className="overflow-hidden rounded-3xl border border-[#E8E6F0] bg-[#111110] p-4 shadow-lg">
        <div className="mb-4 min-h-[3.5rem] text-right font-mono text-4xl font-medium tabular-nums text-white">
          {display}
        </div>
        {stored !== null && pendingOp ? (
          <div className="mb-2 text-right text-xs text-white/50">
            {formatDisplay(stored)} {pendingOp}
          </div>
        ) : null}

        <div className="grid grid-cols-4 gap-2">
          <button type="button" className={`${btn} bg-[#5C5C5E] text-white`} onClick={clearAll}>
            AC
          </button>
          <button type="button" className={`${btn} bg-[#5C5C5E] text-white`} onClick={negate}>
            +/−
          </button>
          <button type="button" className={`${btn} bg-[#5C5C5E] text-white`} onClick={backspace}>
            ⌫
          </button>
          <button type="button" className={`${btn} bg-[#F59E0B] text-white`} onClick={() => pickOp("÷")}>
            ÷
          </button>

          {["7", "8", "9"].map((d) => (
            <button key={d} type="button" className={`${btn} bg-[#3A3A3C] text-white`} onClick={() => inputDigit(d)}>
              {d}
            </button>
          ))}
          <button type="button" className={`${btn} bg-[#F59E0B] text-white`} onClick={() => pickOp("×")}>
            ×
          </button>

          {["4", "5", "6"].map((d) => (
            <button key={d} type="button" className={`${btn} bg-[#3A3A3C] text-white`} onClick={() => inputDigit(d)}>
              {d}
            </button>
          ))}
          <button type="button" className={`${btn} bg-[#F59E0B] text-white`} onClick={() => pickOp("−")}>
            −
          </button>

          {["1", "2", "3"].map((d) => (
            <button key={d} type="button" className={`${btn} bg-[#3A3A3C] text-white`} onClick={() => inputDigit(d)}>
              {d}
            </button>
          ))}
          <button type="button" className={`${btn} bg-[#F59E0B] text-white`} onClick={() => pickOp("+")}>
            +
          </button>

          <button type="button" className={`${btn} col-span-2 bg-[#3A3A3C] text-white`} onClick={() => inputDigit("0")}>
            0
          </button>
          <button type="button" className={`${btn} bg-[#3A3A3C] text-white`} onClick={() => inputDigit(".")}>
            .
          </button>
          <button type="button" className={`${btn} bg-[#F59E0B] text-white`} onClick={equals}>
            =
          </button>
        </div>
      </div>
    </div>
  );
}
