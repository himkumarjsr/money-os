"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { AppIcon } from "@/components/ui/AppIcon";
import FeedbackFormButton from "@/components/FeedbackFormButton";
import { getSupabase } from "@/lib/supabase";
import {
  disableWebPush,
  enableWebPush,
  getWebPushPublicKey,
  isWebPushSupported,
} from "@/lib/webPushClient";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useGamificationStore } from "@/store/gamificationStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const APP_VERSION = "1.0.0";
export default function SettingsPage() {
  return (
    <ProtectedGate>
      <SettingsInner />
    </ProtectedGate>
  );
}

function SettingsInner() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const logoutAction = useAuthStore((s) => s.logout);
  const fkBalance = useGamificationStore((s) => s.fkBalance);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);

  const [resetSent, setResetSent] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({
    morning_tips: false,
    weekly_summary: false,
    payment_alerts: true,
  });
  const [notifSavingKey, setNotifSavingKey] = useState<string | null>(null);
  const [emailConsent, setEmailConsent] = useState(false);
  const [pushConsent, setPushConsent] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [loadingPref, setLoadingPref] = useState(true);
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    setPushSupported(isWebPushSupported() && Boolean(getWebPushPublicKey()));
  }, []);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoadingPref(false);
        return;
      }
      setLoadingPref(true);
      const supabase = getSupabase();
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEmailConsent(Boolean(data.email_consent));
        setPushConsent(Boolean(data.push_consent));
        setNotifPrefs({
          morning_tips: Boolean(data.morning_tips),
          weekly_summary: Boolean(data.weekly_summary),
          payment_alerts: Boolean(data.payment_alerts),
        });
      } else {
        setEmailConsent(false);
        setPushConsent(false);
        setNotifPrefs({
          morning_tips: false,
          weekly_summary: false,
          payment_alerts: true,
        });
      }
      setLoadingPref(false);
    };
    void load();
  }, [user?.id]);

  const toggleEmailConsent = async () => {
    if (!user?.id || savingPref || loadingPref) return;
    const newValue = !emailConsent;
    setEmailConsent(newValue);
    setSavingPref(true);
    const supabase = getSupabase();
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        email_consent: newValue,
        morning_tips: newValue,
        weekly_summary: newValue,
        updated_at: new Date().toISOString(),
        email_consent_at: newValue ? new Date().toISOString() : null,
        declined_at: !newValue ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error(error);
      setEmailConsent(!newValue);
      setSavingPref(false);
      return;
    }
    setNotifPrefs((prev) => ({
      ...prev,
      morning_tips: newValue,
      weekly_summary: newValue,
    }));
    setSavingPref(false);
    localStorage.setItem(
      "finkoin_notif_consent",
      newValue ? "accepted" : "declined",
    );
  };

  const togglePushConsent = async () => {
    if (!user?.id || pushBusy || loadingPref) return;
    setPushBusy(true);
    setPushMessage(null);
    const turningOn = !pushConsent;

    if (turningOn) {
      const result = await enableWebPush();
      if (!result.ok) {
        const msg =
          result.reason === "denied"
            ? "Notification permission was blocked. Enable it in browser/site settings."
            : result.reason === "missing_vapid"
              ? "Push is not configured on this environment yet."
              : result.reason === "unsupported"
                ? "This browser/device does not support Web Push. On iPhone, add Finkoin to Home Screen first."
                : "Could not enable push notifications. Try again.";
        setPushMessage(msg);
        setPushBusy(false);
        return;
      }
      setPushConsent(true);
      setPushMessage("Device push enabled for daily tips.");
    } else {
      await disableWebPush();
      setPushConsent(false);
      setPushMessage("Device push turned off.");
    }
    setPushBusy(false);
  };

  const updatePref = async (key: "payment_alerts", value: boolean) => {
    if (!user?.id) return;
    setNotifSavingKey(key);
    const supabase = getSupabase();
    await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      [key]: value,
      updated_at: new Date().toISOString(),
    });
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    setNotifSavingKey(null);
  };

  const initials = useMemo(
    () => (user?.name?.trim()?.charAt(0) || "U").toUpperCase(),
    [user?.name],
  );

  const handleNameSave = async () => {
    if (!user?.id || !name.trim()) return;
    setNameSaving(true);
    setNameSaved(false);
    try {
      const supabase = getSupabase();
      await supabase
        .from("users")
        .update({ name: name.trim() })
        .eq("id", user.id);
      updateUser({ name: name.trim() });
      setNameSaved(true);
      await refreshUser();
    } catch (e) {
      console.error(e);
    } finally {
      setNameSaving(false);
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setPhotoBusy(true);
    try {
      const supabase = getSupabase();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}-avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      updateUser({ photoURL: publicUrl });
      await refreshUser();
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setPhotoBusy(false);
      e.target.value = "";
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const supabase = getSupabase();
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?type=recovery`,
    });
    setResetSent(true);
  };

  const exportData = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      lastSubmissionSnapshot: lastSubmission ? { ...lastSubmission } : null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `finkoin-export-${user?.id?.slice(0, 8) ?? "user"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [user, lastSubmission]);

  const handleDeleteAccount = async () => {
    const typed = window.prompt(
      "Type DELETE to confirm permanent removal from this device and session. (Server-side purge may require support.)",
    );
    if (typed !== "DELETE") return;
    await logoutAction();
    router.push("/");
    router.refresh();
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10 pb-16 sm:px-6">
      <h1 className="text-3xl font-bold text-[#111110]">Settings</h1>
      <p className="mt-2 text-sm text-[#5F5E5A]">
        Profile, security, and data preferences.
      </p>

      <section className="mt-10 rounded-2xl border border-[#F0EFF8] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
          Profile
        </h2>
        <div className="mt-6 flex items-start gap-6">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#534AB7] text-3xl font-bold text-white">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <label className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#111110] text-sm text-white shadow-md">
              <AppIcon name="pencil" size={15} color="currentColor" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={photoBusy}
                onChange={(ev) => void handlePhotoUpload(ev)}
              />
            </label>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <label
                className="text-xs font-semibold text-[#5F5E5A]"
                htmlFor="set-name"
              >
                Display name
              </label>
              <input
                id="set-name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-sm outline-none focus:border-[#534AB7]"
              />
            </div>
            <button
              type="button"
              disabled={nameSaving}
              onClick={() => void handleNameSave()}
              className="rounded-xl bg-[#534AB7] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {nameSaving ? "Saving…" : "Save name"}
            </button>
            {nameSaved ? (
              <p className="text-xs font-medium text-[#1D9E75]">Saved.</p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 border-t border-[#F0EFF8] pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
            Email
          </p>
          <p className="mt-2 text-sm font-medium text-[#111110]">
            {user?.email ?? "—"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#9B9A94]">
            Email sign-in can&apos;t be changed here.{" "}
            <a
              href="mailto:support@finkoin.com"
              className="font-semibold text-[#534AB7]"
            >
              support@finkoin.com
            </a>
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#F0EFF8] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
          Security
        </h2>
        <button
          type="button"
          onClick={() => void handlePasswordReset()}
          className="mt-4 rounded-xl border border-[#E8E6F0] px-4 py-3 text-sm font-semibold text-[#534AB7]"
        >
          Email me a password reset link
        </button>
        {resetSent ? (
          <p className="mt-3 text-xs font-medium text-[#1D9E75]">
            Password reset email sent to {user?.email}.
          </p>
        ) : null}
      </section>

      <section className="mt-8 rounded-2xl border border-[#F0EFF8] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
          Notifications
        </h2>
        <p className="mt-2 text-xs text-[#9B9A94]">
          Saved to your account and synced across devices.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#F7F7F4] px-4 py-[14px]">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#111110]">
                Daily finance tips
              </div>
              <div className="mt-0.5 text-xs text-[#9B9A94]">
                One tip every morning at 8:30 AM
              </div>
            </div>
            <button
              type="button"
              aria-label={
                emailConsent
                  ? "Turn off daily finance tips"
                  : "Turn on daily finance tips"
              }
              disabled={loadingPref || savingPref}
              onClick={() => void toggleEmailConsent()}
              className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50"
              style={{ background: emailConsent ? "#534AB7" : "#E8E6F0" }}
            >
              <span
                className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200"
                style={{ left: emailConsent ? 23 : 3 }}
              />
            </button>
          </div>
          <div className="bg-[#F7F7F4] px-4 py-[14px]">
            <p className="text-[11px] leading-relaxed text-[#9B9A94]">
              {emailConsent
                ? `✓ Email subscribed — tips sent to ${user?.email ?? "your email"}`
                : "Not subscribed — toggle to receive daily tip emails"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#F7F7F4] px-4 py-[14px]">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#111110]">
                Device push notifications
              </div>
              <div className="mt-0.5 text-xs text-[#9B9A94]">
                OS alert at 8:30 AM even when the app is closed
              </div>
            </div>
            <button
              type="button"
              aria-label={
                pushConsent
                  ? "Turn off device push notifications"
                  : "Turn on device push notifications"
              }
              disabled={loadingPref || pushBusy || !pushSupported}
              onClick={() => void togglePushConsent()}
              className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50"
              style={{ background: pushConsent ? "#534AB7" : "#E8E6F0" }}
            >
              <span
                className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200"
                style={{ left: pushConsent ? 23 : 3 }}
              />
            </button>
          </div>
          <div className="bg-[#F7F7F4] px-4 py-[14px]">
            <p className="text-[11px] leading-relaxed text-[#9B9A94]">
              {!pushSupported
                ? "Push needs a supporting browser. On iPhone: Add to Home Screen, then enable here."
                : pushConsent
                  ? "✓ Device push on — you’ll get an OS notification with each tip"
                  : "Off — enable to get tips as phone notifications"}
            </p>
            {pushMessage ? (
              <p className="mt-1 text-[11px] font-medium text-[#534AB7]">
                {pushMessage}
              </p>
            ) : null}
          </div>
        </div>

        <ToggleRow
          label="Payment alerts"
          checked={notifPrefs.payment_alerts}
          onChange={(v) => void updatePref("payment_alerts", v)}
          disabled={notifSavingKey === "payment_alerts"}
        />
      </section>

      <section className="mt-8 rounded-2xl border border-[#F0EFF8] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
          Data
        </h2>
        <button
          type="button"
          onClick={exportData}
          className="mt-4 w-full rounded-xl bg-[#F7F7F4] py-3 text-sm font-bold text-[#111110]"
        >
          Export my data (JSON)
        </button>
        <button
          type="button"
          onClick={() => void handleDeleteAccount()}
          className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700"
        >
          Delete account &amp; sign out
        </button>
        <p className="mt-2 text-xs text-[#9B9A94]">
          Export includes profile snapshot from this browser session. For full
          deletion from servers, email{" "}
          <a
            href="mailto:privacy@finkoin.com"
            className="font-semibold text-[#534AB7]"
          >
            privacy@finkoin.com
          </a>
          .
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-[#F0EFF8] bg-[#F7F7F4] p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
          App
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[#5F5E5A]">
          <li>
            Version: <strong className="text-[#111110]">{APP_VERSION}</strong>
          </li>
          <li>
            Last analysis draft:{" "}
            <strong className="text-[#111110]">
              {lastSubmission ? "Saved on this device" : "None yet"}
            </strong>
          </li>
          <li>
            FK balance:{" "}
            <strong className="inline-flex items-center gap-1 align-text-bottom text-[#111110]">
              <AppIcon name="coin" size={16} color="#534AB7" />
              {fkBalance} ·{" "}
              <Link href="/rewards" className="text-[#534AB7]">
                Rewards
              </Link>
            </strong>
          </li>
        </ul>
        <div className="mt-4">
          <FeedbackFormButton />
        </div>
      </section>
    </main>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 border-t border-[#F0EFF8] pt-4 first:border-t-0 first:pt-0">
      <span className="text-sm text-[#111110]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(ev) => onChange(ev.target.checked)}
        className="h-5 w-5 accent-[#534AB7]"
      />
    </label>
  );
}
