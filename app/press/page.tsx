import Link from "next/link";

export default function PressComingSoonPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Press</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Coming soon</h1>
      <p className="mt-4 text-slate-600">Media kit and press contacts will appear here.</p>
      <a
        href="mailto:hello@finkoin.com"
        className="mt-8 inline-block font-semibold text-indigo-700 underline-offset-4 hover:underline"
      >
        hello@finkoin.com
      </a>
      <div className="mt-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back home
        </Link>
      </div>
    </div>
  );
}
