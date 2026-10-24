"use client";

import { type FormEvent, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ConsoleAdmin } from "@/lib/adminConsole";
import {
  ADMIN_FEATURES,
  ALL_SECTIONS_KEY,
  sectionKey,
} from "@/lib/adminPermissions";

type SectionOption = { id: string; title: string; group: string };

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

function summarize(a: ConsoleAdmin, sectionCount: number) {
  if (a.isSuper) return "Super admin · everything";
  const sections = a.perms.includes(ALL_SECTIONS_KEY)
    ? "all sections"
    : `${a.perms.filter((p) => p.startsWith("section:")).length}/${sectionCount} sections`;
  const features = ADMIN_FEATURES.filter((f) => a.perms.includes(f.key)).map(
    (f) => f.label,
  );
  return [sections, ...features].join(" · ");
}

/** Per-admin editor for sections and free features (migration 062). */
function PermissionsEditor({
  admin,
  sections,
  busy,
  onSave,
  onCancel,
}: {
  admin: ConsoleAdmin;
  sections: SectionOption[];
  busy: boolean;
  onSave: (perms: string[]) => void;
  onCancel: () => void;
}) {
  const [perms, setPerms] = useState<Set<string>>(() => new Set(admin.perms));
  const allSections = perms.has(ALL_SECTIONS_KEY);
  const groups = [...new Set(sections.map((s) => s.group))];

  function toggle(key: string, on: boolean) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <div className="mt-2 w-full space-y-4 rounded-xl border border-[#E8E6F0] bg-[#F7F7F4] p-3">
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wider text-[#9B9A94]">
          Features they get free
        </legend>
        <div className="mt-1.5 space-y-1.5">
          {ADMIN_FEATURES.map((f) => (
            <label key={f.key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-[#534AB7]"
                checked={perms.has(f.key)}
                onChange={(e) => toggle(f.key, e.target.checked)}
              />
              <span>
                <span className="font-medium text-[#111110]">{f.label}</span>
                <span className="block text-xs text-[#9B9A94]">{f.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wider text-[#9B9A94]">
          Admin sections they can open
        </legend>
        <label className="mt-1.5 flex items-center gap-2 text-sm font-medium text-[#111110]">
          <input
            type="checkbox"
            className="accent-[#534AB7]"
            checked={allSections}
            onChange={(e) => toggle(ALL_SECTIONS_KEY, e.target.checked)}
          />
          All sections, including ones added later
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g}>
              <p className="text-xs font-semibold text-[#5F5E5A]">{g}</p>
              {sections
                .filter((s) => s.group === g)
                .map((s) => (
                  <label
                    key={s.id}
                    className="mt-1 flex items-center gap-2 text-sm text-[#111110]"
                  >
                    <input
                      type="checkbox"
                      className="accent-[#534AB7]"
                      disabled={allSections}
                      checked={allSections || perms.has(sectionKey(s.id))}
                      onChange={(e) =>
                        toggle(sectionKey(s.id), e.target.checked)
                      }
                    />
                    {s.title}
                  </label>
                ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#9B9A94]">
          Admin access (this page) stays with the super admin only.
        </p>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave([...perms])}
          className="rounded-xl bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save permissions"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl border border-[#E8E6F0] bg-white px-4 py-2 text-sm font-semibold text-[#5F5E5A] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AdminAccessManager({
  initialAdmins,
  currentEmail,
  sections,
}: {
  initialAdmins: ConsoleAdmin[];
  currentEmail: string;
  sections: SectionOption[];
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

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
      `${target} is now an admin with no sections or features yet. Pick what they get below.`,
    );
    if (ok) {
      setEmail("");
      setEditing(target);
    }
  }

  async function savePerms(target: string, perms: string[]) {
    const ok = await call(
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, perms }),
      },
      "/api/admin/admins",
      `perms:${target}`,
      `Saved permissions for ${target}.`,
    );
    if (ok) setEditing(null);
  }

  async function remove(target: string) {
    if (
      !window.confirm(
        `Remove admin access for ${target}? Their sections and free features go too.`,
      )
    )
      return;
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
          Invite by email, then choose which admin sections they can open and
          which features they get free. Access starts when they sign in with
          that email, and you can change or remove it any time.
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
          const isEditing = editing === a.email;
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
                <p className="text-xs font-medium text-[#534AB7]">
                  {summarize(a, sections.length)}
                </p>
              </div>
              {isYou || a.isSuper ? null : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(isEditing ? null : a.email)}
                    disabled={busy !== null}
                    className="rounded-lg border border-[#E8E6F0] px-3 py-1 text-xs font-semibold text-[#534AB7] hover:bg-[#EEEDFE] disabled:opacity-60"
                  >
                    {isEditing ? "Close" : "Permissions"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(a.email)}
                    disabled={busy !== null}
                    className="rounded-lg border border-[#E8E6F0] px-3 py-1 text-xs font-semibold text-[#E24B4A] hover:bg-[#FCEBEB] disabled:opacity-60"
                  >
                    {busy === a.email ? "Removing…" : "Remove"}
                  </button>
                </div>
              )}
              {isEditing ? (
                <PermissionsEditor
                  key={a.perms.join(",")}
                  admin={a}
                  sections={sections}
                  busy={busy === `perms:${a.email}`}
                  onSave={(perms) => void savePerms(a.email, perms)}
                  onCancel={() => setEditing(null)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
