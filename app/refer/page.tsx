"use client";

import { useAuthStore } from "@/store/authStore";

export default function ReferPage() {
  const code = useAuthStore((s) => s.user?.referralCode) ?? "FINK0000";
  const link = `finkoin.com?ref=${code}`;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Refer and earn</h1>
      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{link}</p>
    </main>
  );
}

