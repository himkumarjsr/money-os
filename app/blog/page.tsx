import Link from "next/link";

export default function BlogComingSoonPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Blog</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Coming soon</h1>
      <p className="mt-4 text-slate-600">We&apos;re preparing guides and stories on money for India.</p>
      <Link href="/" className="mt-8 inline-block font-semibold text-indigo-700 underline-offset-4 hover:underline">
        ← Back home
      </Link>
    </div>
  );
}
