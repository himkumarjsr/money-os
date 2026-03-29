import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-white px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <p className="mt-3 text-slate-600">Full plans page coming soon.</p>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-[#534AB7]">
          ← Home
        </Link>
      </div>
    </div>
  );
}
