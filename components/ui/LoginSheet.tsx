"use client";

import { bootstrapAuthUser, sendOTP, signInWithGoogle, verifyOTP } from "@/lib/auth";
import { useState } from "react";

type Step = "method" | "otp" | "name";

export default function LoginSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("method");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const startCountdown = () => {
    setCountdown(30);
    const id = window.setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    const { error: otpError } = await sendOTP(phone);
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStep("otp");
    startCountdown();
  };

  const handleVerifyOtp = async () => {
    const token = otp.join("");
    if (token.length !== 6) return;
    setLoading(true);
    setError(null);
    const { error: verifyError, data } = await verifyOTP(phone, token);
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message || "Invalid OTP");
      return;
    }
    const id = data?.user?.id ?? `phone-${phone}`;
    bootstrapAuthUser({
      id,
      phone: `+91${phone}`,
      name: null,
      email: data?.user?.email ?? null,
      photoURL: null,
    });
    setStep("name");
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: googleError } = await signInWithGoogle();
    setLoading(false);
    if (googleError) setError(googleError.message);
  };

  const finishName = () => {
    bootstrapAuthUser({
      id: `user-${Date.now()}`,
      name: name || "User",
      phone: `+91${phone}`,
      email: null,
      photoURL: null,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[999] bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[1000] h-[480px] rounded-t-[20px] bg-white p-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded bg-[#E0DFF8]" />
        {step === "method" ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Sign in to Finkoin</h3>
            <p className="text-sm text-slate-500">Save your analysis and sync across devices</p>
            <button
              type="button"
              onClick={handleGoogle}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-[#E0DFF8] bg-white text-sm font-semibold"
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <div className="relative py-1 text-center text-xs text-slate-400">
              <span className="bg-white px-2">or</span>
            </div>
            <div className="flex h-[52px] items-center rounded-xl border border-[#E0DFF8] px-3">
              <span className="pr-2 text-slate-500">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full border-none outline-none"
                placeholder="Mobile number"
              />
            </div>
            <button
              type="button"
              className="h-[52px] w-full rounded-xl bg-[#534AB7] font-semibold text-white"
              onClick={handleSendOtp}
              disabled={loading || phone.length < 10}
            >
              Send OTP
            </button>
          </div>
        ) : null}

        {step === "otp" ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Enter OTP</h3>
            <p className="text-sm text-slate-500">Sent to +91 {phone}</p>
            <button type="button" className="text-sm font-semibold text-[#534AB7]" onClick={() => setStep("method")}>
              Change number
            </button>
            <div className="flex gap-2">
              {otp.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  maxLength={1}
                  inputMode="numeric"
                  onChange={(e) => {
                    const next = [...otp];
                    next[i] = e.target.value.replace(/\D/g, "");
                    setOtp(next);
                  }}
                  className={`h-[52px] w-[44px] rounded-[10px] border text-center text-xl font-bold outline-none ${error ? "border-red-400" : "border-[#E0DFF8]"}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="h-[48px] w-full rounded-xl bg-[#534AB7] font-semibold text-white"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              Verify OTP
            </button>
            <p className="text-sm text-slate-500">{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}</p>
          </div>
        ) : null}

        {step === "name" ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">What should we call you?</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-[52px] w-full rounded-xl border border-[#E0DFF8] px-3 outline-none"
            />
            <button type="button" className="h-[52px] w-full rounded-xl bg-[#534AB7] font-semibold text-white" onClick={finishName}>
              Continue
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </>
  );
}

