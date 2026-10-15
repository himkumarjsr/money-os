"use client";

import { type FormEvent, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ConsoleAdmin } from "@/lib/adminConsole";

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function AdminAccessManager({
  initialAdmins,
  currentEmail,
}: {
  initialAdmins: ConsoleAdmin[];
  currentEmail: string;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function call(
    init: RequestInit,
    url: string,
    key: string,
    done: string,
  ) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch(url, init);
      const body = (await res.json().catch(() => ({}))) as {
        admins?: ConsoleAdmin[];
        error?: string;
      };
      if (!res.ok || !body.admins) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return false;
      }
      setAdmins(body.admins);
      setNotice(done);
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;
    const ok = await call(
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      },
      "/api/admin/admins",
      "invite",
      `${target} can now open the admin console.`,
    );
    if (ok) setEmail("");
  }

  async function remove(target: string) {
    if (!window.confirm(`Remove admin access for ${target}?`)) return;
    await call(
      { method: "DELETE" },
      `/api/admin/admins?email=${encodeURIComponent(target)}`,
      target,
      `${target} no longer has admin access.`,
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#D4D2F5] bg-[#F7F7F4] p-4 md:p-5">
      <div>
        <h2 className="text-lg font-bold text-[#111110]">Manage admins</h2>
        <p className="text-sm text-[#5F5E5A]">
          Invite by email. Access starts when they sign in with that email.
        </p>
      </div>

      <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="admin-invite-email" className="sr-only">
          Email to invite
        </label>
        <input
          id="admin-invite-email"
          type="email"
          required
          autoComplete="off"
          placeholder="teammate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-[#E8E6F0] bg-white px-3 py-2 text-sm text-[#111110] outline-none focus:border-[#534AB7]"
        />
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-xl bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy === "invite" ? "Inviting…" : "Invite admin"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-sm font-medium text-[#E24B4A]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm font-medium text-[#1D9E75]">
          {notice}
        </p>
      ) : null}

      <ul className="divide-y divide-[#F0EFF8] overflow-hidden rounded-xl border border-[#E8E6F0] bg-white">
        {admins.map((a) => {
          const isYou = a.email === currentEmail;
          return (
            <li
              key={a.email}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111110]">
                  {a.email}
                  {isYou ? (
                    <span className="ml-1.5 text-xs font-medium text-[#534AB7]">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[#9B9A94]">
                  {a.invitedBy === "seed"
                    ? "First admin"
                    : `Invited by ${a.invitedBy}`}
                  {a.createdAt ? ` · ${formatDate(a.createdAt)}` : ""}
                  {a.hasAccount ? "" : " · hasn't signed in yet"}
                </p>
              </div>
              {isYou ? null : (
                <button
                  type="button"
                  onClick={() => void remove(a.email)}
                  disabled={busy !== null}
                  className="rounded-lg border border-[#E8E6F0] px-3 py-1 text-xs font-semibold text-[#E24B4A] hover:bg-[#FCEBEB] disabled:opacity-60"
                >
                  {busy === a.email ? "Removing…" : "Remove"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
