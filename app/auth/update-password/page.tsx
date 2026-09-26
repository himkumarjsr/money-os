"use client";

import {
  AUTH_RECOVERY_PATH,
  completeAuthSessionFromUrl,
} from "@/lib/authRecovery";
import { getSupabase } from "@/lib/supabase";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = getSupabase();
      const result = await completeAuthSessionFromUrl(supabase);

      if (cancelled) return;

      if (!result.ok) {
        if (result.error) {
          setError(result.error);
          setSessionReady(true);
          return;
        }
        router.replace("/login?error=session");
        return;
      }

      // Drop auth tokens from the address bar once the session is in cookies.
      if (
        window.location.search ||
        window.location.hash.includes("access_token")
      ) {
        window.history.replaceState(null, "", AUTH_RECOVERY_PATH);
      }

      setSessionReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const submit = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    const supabase = getSupabase();
    const { error: updError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updError) {
      setError(updError.message);
      return;
    }

    router.replace("/login?reset=ok");
  };

  if (!sessionReady) {
    return <BrandPageLoader fullScreen={false} label="Verifying reset link…" />;
  }

  const hasSessionError = error && !password;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F4] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-extrabold text-[#111110]">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-[#9B9A94]">
          Use at least 6 characters.
        </p>

        {hasSessionError ? (
          <>
            <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
            <p className="mt-4 text-center text-sm">
              <Link
                href="/auth/reset-password"
                className="font-semibold text-[#534AB7]"
              >
                Request a new reset link
              </Link>
            </p>
          </>
        ) : (
          <>
            <label
              className="mt-6 block text-sm font-semibold text-[#5F5E5A]"
              htmlFor="pw"
            >
              New password
            </label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#E8E6F0] px-4 text-sm outline-none focus:border-[#534AB7]"
            />

            <label
              className="mt-4 block text-sm font-semibold text-[#5F5E5A]"
              htmlFor="pw2"
            >
              Confirm password
            </label>
            <input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#E8E6F0] px-4 text-sm outline-none focus:border-[#534AB7]"
            />

            {error ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="mt-6 h-12 w-full rounded-xl bg-[#534AB7] text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
          </>
        )}

        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-semibold text-[#534AB7]">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
