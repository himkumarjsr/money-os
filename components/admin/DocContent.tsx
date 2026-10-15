import { Fragment, type ReactNode } from "react";
import type { ApiDoc, DocBlock, DocSection } from "@/lib/adminDocs";

/** Renders `inline code` spans written with backticks. */
function Rich({ text }: { text: string }) {
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="rounded bg-[#EEEDFE] px-1 py-0.5 font-mono text-[0.85em] text-[#3C3489]"
          >
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const METHOD_TONE: Record<string, string> = {
  GET: "bg-[#E1F5EE] text-[#1D9E75]",
  POST: "bg-[#EEEDFE] text-[#534AB7]",
  PUT: "bg-[#FFF3E0] text-[#BA7517]",
  DELETE: "bg-[#FCEBEB] text-[#E24B4A]",
};

function MethodBadge({ method }: { method: string }) {
  const tone =
    METHOD_TONE[method.split("/")[0]] ?? "bg-[#F7F7F4] text-[#5F5E5A]";
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold ${tone}`}
    >
      {method}
    </span>
  );
}

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-[#E8E6F0] bg-[#F7F7F4]">
      {title ? (
        <figcaption className="border-b border-[#E8E6F0] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#5F5E5A]">
          {title}
        </figcaption>
      ) : null}
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-[#111110]">
        {code}
      </pre>
    </figure>
  );
}

function Table({
  head,
  rows,
}: {
  head: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8E6F0] bg-white">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[#F7F7F4]">
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-[#E8E6F0] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#5F5E5A]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="align-top">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="border-b border-[#F0EFF8] px-3 py-2 text-[#111110]"
                >
                  <Rich text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
        {label}
      </p>
      {children}
    </div>
  );
}

function ApiCard({ api }: { api: ApiDoc }) {
  return (
    <section className="space-y-3 rounded-2xl border border-[#E8E6F0] bg-white p-4">
      <div className="flex flex-wrap items-start gap-2">
        <MethodBadge method={api.method} />
        <code className="break-all font-mono text-sm font-semibold text-[#111110]">
          {api.path}
        </code>
      </div>
      <p className="text-sm text-[#5F5E5A]">
        <Rich text={api.summary} />
      </p>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[120px_1fr]">
        <dt className="font-semibold text-[#111110]">Auth</dt>
        <dd className="text-[#5F5E5A]">
          <Rich text={api.auth} />
        </dd>
        {api.rateLimit ? (
          <>
            <dt className="font-semibold text-[#111110]">Rate limit</dt>
            <dd className="text-[#5F5E5A]">
              <Rich text={api.rateLimit} />
            </dd>
          </>
        ) : null}
        {api.callers ? (
          <>
            <dt className="font-semibold text-[#111110]">Called from</dt>
            <dd className="text-[#5F5E5A]">
              <Rich text={api.callers} />
            </dd>
          </>
        ) : null}
      </dl>
      {api.query?.length ? (
        <Labelled label="Query">
          <Table head={["Param", "Meaning"]} rows={api.query} />
        </Labelled>
      ) : null}
      {api.request ? (
        <Labelled label="Request">
          <CodeBlock code={api.request} />
        </Labelled>
      ) : null}
      {api.response ? (
        <Labelled label="Response">
          <CodeBlock code={api.response} />
        </Labelled>
      ) : null}
      {api.errors?.length ? (
        <Labelled label="Errors">
          <Table head={["Status", "Meaning"]} rows={api.errors} />
        </Labelled>
      ) : null}
      {api.notes ? (
        <p className="text-sm text-[#5F5E5A]">
          <Rich text={api.notes} />
        </p>
      ) : null}
    </section>
  );
}

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "h":
      return (
        <h2 className="pt-2 text-lg font-bold text-[#111110]">{block.text}</h2>
      );
    case "p":
      return (
        <p className="text-[15px] leading-relaxed text-[#5F5E5A]">
          <Rich text={block.text} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#5F5E5A] ${
            block.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item, i) => (
            <li key={i}>
              <Rich text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "table":
      return <Table head={block.head} rows={block.rows} />;
    case "code":
    case "diagram":
      return <CodeBlock title={block.title} code={block.code} />;
    case "callout":
      return (
        <div
          className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            block.tone === "warn"
              ? "border-[#F0D9A8] bg-[#FFF3E0] text-[#7A4D0F]"
              : "border-[#D4D2F5] bg-[#EEEDFE] text-[#3C3489]"
          }`}
        >
          <Rich text={block.text} />
        </div>
      );
    case "api":
      return <ApiCard api={block.api} />;
  }
}

/** `children` render between the header and the section body (e.g. a tool). */
export function DocContent({
  section,
  children,
}: {
  section: DocSection;
  children?: ReactNode;
}) {
  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
          {section.group}
        </p>
        <h1 className="text-2xl font-extrabold text-[#111110] md:text-3xl">
          {section.title}
        </h1>
        <p className="text-[15px] text-[#5F5E5A]">{section.summary}</p>
      </header>
      {children}
      {section.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </article>
  );
}
