import Link from "next/link";
import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, j) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      return (
        <Link key={`${keyPrefix}-${j}`} href={m[2]} className="font-semibold text-[#534AB7] hover:underline">
          {m[1]}
        </Link>
      );
    }
    const bolded = part.split(/\*\*([^*]+)\*\*/g);
    if (bolded.length > 1) {
      return bolded.map((b, k) =>
        k % 2 === 1 ? (
          <strong key={`${keyPrefix}-${j}-${k}`} className="font-semibold text-slate-900">
            {b}
          </strong>
        ) : (
          <span key={`${keyPrefix}-${j}-${k}`}>{b}</span>
        ),
      );
    }
    return <span key={`${keyPrefix}-${j}`}>{part}</span>;
  });
}

function isMarkdownTable(block: string): boolean {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  if (!lines[0].includes("|")) return false;
  const sep = lines[1].replace(/\s/g, "");
  return /^\|?[\-:|]+/.test(sep) && sep.includes("-");
}

function parseTableRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function renderTable(block: string, i: number) {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const header = parseTableRow(lines[0]);
  const bodyRows = lines.slice(2).map(parseTableRow);
  return (
    <div key={`tbl-${i}`} className="mt-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {header.map((h, hi) => (
              <th key={hi} scope="col" className="whitespace-normal px-3 py-3 font-semibold text-slate-900 sm:px-4">
                <span className="inline">{renderInline(h, `h-${i}-${hi}`)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {bodyRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="whitespace-normal px-3 py-3 text-slate-700 sm:px-4">
                  <span className="inline">{renderInline(cell, `c-${i}-${ri}-${ci}`)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isBulletList(block: string): boolean {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((l) => /^[-*]\s+/.test(l));
}

function renderBulletList(block: string, i: number) {
  const items = block
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s+/, ""));
  return (
    <ul key={`ul-${i}`} className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-700">
      {items.map((item, li) => (
        <li key={li}>{renderInline(item, `li-${i}-${li}`)}</li>
      ))}
    </ul>
  );
}

export function renderBlogBody(body: string) {
  const blocks = body.trim().split(/\n\n+/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    const firstLine = trimmed.split("\n")[0] ?? "";

    if (isMarkdownTable(trimmed)) {
      return renderTable(trimmed, i);
    }

    if (isBulletList(trimmed)) {
      return renderBulletList(trimmed, i);
    }

    if (firstLine.startsWith("### ")) {
      const rest = trimmed.split("\n").slice(1).join("\n");
      return (
        <div key={`h3-${i}`}>
          <h3 className="mt-8 text-lg font-semibold tracking-tight text-slate-900">
            {firstLine.replace(/^###\s+/, "")}
          </h3>
          {rest.trim() ? (
            <p className="mt-2 text-base leading-relaxed text-slate-700">{renderInline(rest.trim(), `p3-${i}`)}</p>
          ) : null}
        </div>
      );
    }

    if (firstLine.startsWith("## ")) {
      return (
        <h2 key={`h2-${i}`} className="mt-10 text-xl font-bold text-slate-900">
          {firstLine.replace(/^##\s+/, "")}
        </h2>
      );
    }

    return (
      <p key={`p-${i}`} className="mt-4 text-base leading-relaxed text-slate-700">
        {trimmed.split("\n").map((line, li) => (
          <span key={li}>
            {li > 0 ? <br /> : null}
            {renderInline(line, `ln-${i}-${li}`)}
          </span>
        ))}
      </p>
    );
  });
}
