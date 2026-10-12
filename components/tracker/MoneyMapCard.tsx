"use client";

import Link from "next/link";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import {
  MONEY_MAP_COPY,
  natureLockedTeaser,
  natureMoverLine,
  natureRupees,
  natureSavingLine,
  natureTrendArrow,
  natureTrendText,
  natureTrendTone,
  type NatureReport,
  type NatureRow,
} from "@/lib/trackerNatureReport";

const TONE_CLASS = {
  good: "text-[#1D5C3A]",
  bad: "text-[#B42323]",
  neutral: "text-[#5F5E5A]",
} as const;

/** First column stays put while the months scroll under it. */
const STICKY_BASE =
  "sticky left-0 z-10 shadow-[6px_0_6px_-6px_rgba(17,17,16,0.18)]";
const STICKY = `${STICKY_BASE} bg-white pl-4 pr-3`;
const ROW_BORDER = "border-t border-[#E8E6F0]";

function amountText(n: number, visible: boolean): string {
  if (!visible) return "₹••••••";
  return `${n < 0 ? "-" : ""}${natureRupees(n)}`;
}

/** Placeholder shapes for the locked card: no real amounts reach the page. */
const SKELETON_ROWS = [
  "Needs",
  "Wants",
  "Habits",
  "Insurance",
  "Loans",
  "Investment",
  "Credit card",
] as const;

function EyeToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-[#534AB7]"
    >
      {visible ? MONEY_MAP_COPY.hideAmounts : MONEY_MAP_COPY.showAmounts}
    </button>
  );
}

function ReportModal({
  report,
  visible,
  onClose,
}: {
  report: NatureReport;
  visible: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const mask = (s: string) => (visible ? s : s.replace(/₹[\d,]+/g, "₹••••••"));
  const saving = report.possibleSaving;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#E8E6F0] bg-white p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id={titleId} className="text-base font-bold text-[#111110]">
            {MONEY_MAP_COPY.reportTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] rounded-lg px-2 text-sm font-semibold text-[#534AB7]"
          >
            {MONEY_MAP_COPY.close}
          </button>
        </div>

        <section className="mb-4">
          <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#534AB7]">
            {MONEY_MAP_COPY.moverHeading}
          </h4>
          <p className="text-sm font-medium text-[#111110]">
            {mask(natureMoverLine(report))}
          </p>
        </section>

        {report.insights.length > 0 ? (
          <section className="mb-4">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#534AB7]">
              {MONEY_MAP_COPY.insightsHeading}
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#111110]">
              {report.insights.map((line) => (
                <li key={line}>{mask(line)}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {saving ? (
          <section className="mb-4">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#534AB7]">
              {MONEY_MAP_COPY.savingHeading}
            </h4>
            <p className="text-sm text-[#111110]">
              {mask(natureSavingLine(saving))}
            </p>
          </section>
        ) : null}

        {report.suggestedAction ? (
          <section className="rounded-xl bg-[#EEEDFE] p-3">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#534AB7]">
              {MONEY_MAP_COPY.actionHeading}
            </h4>
            <p className="text-sm font-medium text-[#111110]">
              {mask(report.suggestedAction)}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function TrendCell({ row, hasPrev }: { row: NatureRow; hasPrev: boolean }) {
  const tone = natureTrendTone(row);
  const text = natureTrendText(row, hasPrev);
  return (
    <td
      className={`${ROW_BORDER} whitespace-nowrap py-2 pl-2.5 pr-4 text-right align-middle text-xs font-semibold sm:pl-3 ${TONE_CLASS[tone]}`}
    >
      {hasPrev ? (
        <>
          <span aria-hidden="true">{natureTrendArrow(row.trend)} </span>
          {text}
        </>
      ) : (
        text
      )}
    </td>
  );
}

export default function MoneyMapCard({
  id,
  report,
  locked,
  forceVisible = false,
}: {
  /** Anchor for the "Monthly report" jump link at the top of the tracker. */
  id?: string;
  /** Null while loading or with fewer than 2 months of data: renders nothing. */
  report: NatureReport | null;
  /** Free tier: skeleton + teaser only, no real amounts rendered. */
  locked: boolean;
  /** Master "Show all" privacy switch from the tracker. */
  forceVisible?: boolean;
}) {
  const [localVisible, setLocalVisible] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const baseId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthCount = report?.months.length ?? 0;
  // Open on the latest months (and the trend), the ones people compare first,
  // starting on a whole column rather than a half-cut amount.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sticky = el.querySelector<HTMLElement>("thead th");
    const stickyW = sticky?.offsetWidth ?? 0;
    el.style.scrollPaddingLeft = `${stickyW}px`;
    const end = el.scrollWidth - el.clientWidth;
    let target = 0;
    el.querySelectorAll<HTMLElement>("thead th[data-month]").forEach((th) => {
      const left = th.offsetLeft - stickyW;
      if (left <= end) target = Math.max(target, left);
    });
    el.scrollLeft = target;
  }, [monthCount, locked]);
  if (!report) return null;
  const visible = localVisible || forceVisible;

  if (locked) {
    return (
      <section
        id={id}
        aria-label={MONEY_MAP_COPY.title}
        className="mb-5 scroll-mt-24 rounded-2xl border border-[#E8E6F0] bg-white p-4"
      >
        <h2 className="text-sm font-bold text-[#111110]">
          {MONEY_MAP_COPY.title}
        </h2>
        <p className="mb-3 text-xs text-[#5F5E5A]">
          {MONEY_MAP_COPY.lockedHeading}
        </p>
        <div aria-hidden="true" className="select-none overflow-hidden">
          <div className="pointer-events-none blur-[5px]">
            {SKELETON_ROWS.map((label) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-[#E8E6F0] py-2 text-sm text-[#111110]"
              >
                <span>{label}</span>
                <span className="tabular-nums">₹00,000 ₹00,000 ₹00,000</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-[#111110]">
          {natureLockedTeaser(report)}
        </p>
        <Link
          href="/plans"
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#534AB7] px-4 text-sm font-semibold text-white"
        >
          {MONEY_MAP_COPY.cta}
        </Link>
      </section>
    );
  }

  const prevOk = report.prevIndex != null;
  const toggleRow = (key: string) =>
    setExpanded((cur) => (cur === key ? null : key));

  return (
    <section
      id={id}
      aria-label={MONEY_MAP_COPY.title}
      className="mb-5 scroll-mt-24 rounded-2xl border border-[#E8E6F0] bg-white p-4"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#111110]">
            {MONEY_MAP_COPY.title}
          </h2>
          <p className="text-xs text-[#5F5E5A]">{MONEY_MAP_COPY.subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <EyeToggle
            visible={visible}
            onToggle={() => setLocalVisible((v) => !v)}
          />
          <button
            type="button"
            onClick={() => setShowReport(true)}
            aria-haspopup="dialog"
            className="min-h-[36px] rounded-lg bg-[#EEEDFE] px-3 text-xs font-bold text-[#534AB7]"
          >
            {MONEY_MAP_COPY.reportButton}
          </button>
        </div>
      </div>

      {/* Edge-to-edge scroller: the sticky Nature column sits flush with the
          card edge, so scrolled amounts never peek out beside it. Borders
          live on the cells (border-separate) so the sticky cells keep them. */}
      <div
        ref={scrollRef}
        className="-mx-4 snap-x snap-proximity overflow-x-auto overscroll-x-contain"
      >
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Spending by nature for each month, with the change since the
            previous month
          </caption>
          <thead>
            <tr className="text-xs text-[#5F5E5A]">
              <th
                scope="col"
                className={`${STICKY} py-2 text-left font-semibold`}
              >
                Nature
              </th>
              {report.months.map((m) => (
                <th
                  key={m.key}
                  scope="col"
                  data-month
                  className="snap-start whitespace-nowrap px-2.5 py-2 text-right font-semibold sm:px-3"
                >
                  {m.short}
                  {m.partial ? (
                    <span className="block text-[10px] font-normal">
                      {MONEY_MAP_COPY.partialNote}
                    </span>
                  ) : null}
                </th>
              ))}
              <th
                scope="col"
                className="whitespace-nowrap py-2 pl-2.5 pr-4 text-right font-semibold sm:pl-3"
              >
                {MONEY_MAP_COPY.trendColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => {
              const open = expanded === row.key;
              const canOpen = row.subcategories.length > 0;
              const panelId = `${baseId}-${row.key}`;
              return (
                <Fragment key={row.key}>
                  <tr>
                    <th
                      scope="row"
                      className={`${STICKY} ${ROW_BORDER} py-2 text-left align-middle font-medium text-[#111110]`}
                    >
                      {canOpen ? (
                        <button
                          type="button"
                          onClick={() => toggleRow(row.key)}
                          aria-expanded={open}
                          aria-controls={panelId}
                          className="flex min-h-[36px] items-center gap-1.5 whitespace-nowrap text-left"
                        >
                          <span
                            aria-hidden="true"
                            className="w-2.5 text-[10px] text-[#5F5E5A]"
                          >
                            {open ? "▾" : "▸"}
                          </span>
                          {row.label}
                        </button>
                      ) : (
                        <span className="block whitespace-nowrap pl-4">
                          {row.label}
                          {row.inTotal ? null : (
                            <span className="block max-w-[112px] whitespace-normal text-[10px] font-normal leading-snug text-[#5F5E5A] sm:max-w-[160px]">
                              {MONEY_MAP_COPY.cardNote}
                            </span>
                          )}
                        </span>
                      )}
                    </th>
                    {report.months.map((m, i) => (
                      <td
                        key={m.key}
                        className={`${ROW_BORDER} whitespace-nowrap px-2.5 py-2 text-right align-middle tabular-nums text-[#111110] sm:px-3`}
                      >
                        {m.hasData ? (
                          <>
                            {amountText(row.amounts[i], visible)}
                            {row.shares[i] != null ? (
                              <span className="block text-[10px] text-[#5F5E5A]">
                                {Math.round(row.shares[i] as number)}%
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span aria-label="No data">–</span>
                        )}
                      </td>
                    ))}
                    <TrendCell row={row} hasPrev={prevOk} />
                  </tr>
                  {open
                    ? row.subcategories.map((sub, si) => (
                        <tr
                          key={sub.id}
                          id={si === 0 ? panelId : undefined}
                          className="text-xs"
                        >
                          <th
                            scope="row"
                            className={`${STICKY_BASE} bg-[#F7F7F4] py-1.5 pl-8 pr-3 text-left font-normal text-[#5F5E5A]`}
                          >
                            <span className="block max-w-[120px] whitespace-normal sm:max-w-[170px]">
                              {sub.label}
                            </span>
                          </th>
                          {report.months.map((m, i) => (
                            <td
                              key={m.key}
                              className="whitespace-nowrap bg-[#F7F7F4] px-2.5 py-1.5 text-right tabular-nums text-[#111110] sm:px-3"
                            >
                              {m.hasData
                                ? amountText(sub.amounts[i], visible)
                                : "–"}
                            </td>
                          ))}
                          <td className="bg-[#F7F7F4] pr-4" />
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <th
                scope="row"
                className={`${STICKY} ${ROW_BORDER} py-2.5 text-left text-[#111110]`}
              >
                {MONEY_MAP_COPY.totalRow}
              </th>
              {report.months.map((m, i) => (
                <td
                  key={m.key}
                  className={`${ROW_BORDER} whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums text-[#111110] sm:px-3`}
                >
                  {m.hasData ? amountText(report.totals[i], visible) : "–"}
                </td>
              ))}
              <td className={`${ROW_BORDER} pr-4`} />
            </tr>
          </tfoot>
        </table>
      </div>

      {showReport ? (
        <ReportModal
          report={report}
          visible={visible}
          onClose={() => setShowReport(false)}
        />
      ) : null}
    </section>
  );
}
