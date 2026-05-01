import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-indigo-50 via-white to-violet-50/70 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-[#E8E6F0] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">Contact Finkoin</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">We are here to help</h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            For support, feedback, or partnership queries, reach us through the details below.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#ECEAF5] bg-[#FAFAFE] p-4">
              <p className="text-xs uppercase tracking-wide text-[#7A7871]">Email</p>
              <a
                href="mailto:finkoin.os@gmail.com"
                className="mt-2 inline-block text-lg font-semibold text-[#534AB7] hover:underline"
              >
                finkoin.os@gmail.com
              </a>
            </div>

            <div className="rounded-2xl border border-[#ECEAF5] bg-[#FAFAFE] p-4">
              <p className="text-xs uppercase tracking-wide text-[#7A7871]">Phone</p>
              <a
                href="tel:+918095373711"
                className="mt-2 inline-block text-lg font-semibold text-[#534AB7] hover:underline"
              >
                +91 8095373711
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/analyse"
              className="inline-flex h-11 items-center rounded-xl bg-[#534AB7] px-5 font-semibold text-white"
            >
              Back to Analyse
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-xl border border-[#D8D5EA] px-5 font-semibold text-slate-700"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
