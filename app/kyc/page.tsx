import BackLink from "@/components/ui/BackLink";

export default function KycPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <BackLink fallbackHref="/profile" label="Back" />
      <h1 className="mt-3 text-2xl font-bold text-slate-900">KYC status</h1>
      <p className="mt-2 text-sm text-slate-600">
        PAN and Aadhaar verification status appears here.
      </p>
    </main>
  );
}
