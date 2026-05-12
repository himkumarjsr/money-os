"use client";

import { REFERRAL_PENDING_STORAGE_KEY } from "@/lib/referralRewards";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") || "/analyse";

  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const initAuth = useAuthStore((s) => s.initAuth);

  const [mode, setMode] = useState<"login" | "signup" | "reset">(() => {
    const m = searchParams?.get("mode");
    if (m === "signup") return "signup";
    if (m === "reset") return "reset";
    return "login";
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (hasInitialized && isLoggedIn) {
      router.push(redirectTo.startsWith("/") ? redirectTo : "/analyse");
    }
  }, [hasInitialized, isLoggedIn, router, redirectTo]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref")?.trim();

      if (ref) {
        const normalized = ref.toUpperCase().trim();
        console.log("Login page: ref in URL =", normalized);
        localStorage.setItem(
          REFERRAL_PENDING_STORAGE_KEY,
          JSON.stringify({
            code: normalized,
            savedAt: new Date().toISOString(),
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        );
        console.log("Login page: saved ref to localStorage");
      } else {
        const existing = localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY);
        console.log("Login page: existing ref =", existing);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (mode === "reset") {
      setSubmitting(true);
      const supabase = getSupabase();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      setSubmitting(false);
      if (resetErr) {
        setError(resetErr.message);
      } else {
        setSuccess(`Reset link sent to ${email}. Check your inbox.`);
      }
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabase();

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Please enter your name");
        setSubmitting(false);
        return;
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      setSubmitting(false);

      if (signUpErr) {
        setError(signUpErr.message);
        return;
      }

      if (data.user && !data.session) {
        setSuccess(
          "Account created! Check your email to verify your account, then log in.",
        );
        setMode("login");
        setPassword("");
        return;
      }

      await initAuth();

      if (data.session?.user?.id) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const supabaseClient = getSupabase();
        const {
          data: { session: freshSession },
        } = await supabaseClient.auth.getSession();
        console.log("Login signup: session =", !!freshSession);
        console.log("Login signup: checking referral");
        const stored = localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY);
        console.log("Login signup: localStorage ref =", stored);
        if (freshSession?.user) {
          try {
            const { applyPendingReferralRewards } = await import("@/lib/referralRewards");
            await applyPendingReferralRewards(supabaseClient, freshSession.user.id);
            console.log("Login signup: referral done");
          } catch (err) {
            console.error("Login signup referral:", err);
          }
        }
      }

      router.push(redirectTo.startsWith("/") ? redirectTo : "/analyse");
      return;
    }

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInErr) {
      setError(
        signInErr.message.includes("Invalid") ? "Wrong email or password. Try again." : signInErr.message,
      );
      return;
    }

    if (data.user) {
      await initAuth();
      router.push(redirectTo.startsWith("/") ? redirectTo : "/analyse");
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = getSupabase();
    const safeNext = redirectTo.startsWith("/") ? redirectTo : "/analyse";
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (oauthErr) setError(oauthErr.message);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #F7F7F4 0%, #EEEDFE 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "40px 32px",
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 8px 48px rgba(83,74,183,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#534AB7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            FK
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#534AB7" }}>Finkoin</span>
        </div>

        {mode !== "reset" ? (
          <div
            style={{
              display: "flex",
              background: "#F7F7F4",
              borderRadius: 12,
              padding: 4,
              marginBottom: 28,
            }}
          >
            {[
              { key: "login" as const, label: "Login" },
              { key: "signup" as const, label: "Sign up" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setMode(tab.key);
                  setError("");
                  setSuccess("");
                }}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 9,
                  border: "none",
                  background: mode === tab.key ? "white" : "transparent",
                  color: mode === tab.key ? "#534AB7" : "#9B9A94",
                  fontWeight: mode === tab.key ? 700 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: mode === tab.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 6,
          }}
        >
          {mode === "login" ? "Welcome back" : null}
          {mode === "signup" ? "Create account" : null}
          {mode === "reset" ? "Reset password" : null}
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "#9B9A94",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          {mode === "login" ? "Log in to see your financial plan." : null}
          {mode === "signup" ? "Join Indians taking control of finances." : null}
          {mode === "reset" ? "Enter your email to receive a reset link." : null}
        </p>

        {mode === "signup" ? (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#5F5E5A",
                display: "block",
                marginBottom: 6,
              }}
            >
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "1.5px solid #E8E6F0",
                padding: "0 16px",
                fontSize: 15,
                color: "#111110",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#534AB7";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#E8E6F0";
              }}
            />
          </div>
        ) : null}

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#5F5E5A",
              display: "block",
              marginBottom: 6,
            }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1.5px solid #E8E6F0",
              padding: "0 16px",
              fontSize: 15,
              color: "#111110",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#534AB7";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E8E6F0";
            }}
          />
        </div>

        {mode !== "reset" ? (
          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#5F5E5A",
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSubmit();
                }}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1.5px solid #E8E6F0",
                  padding: "0 48px 0 16px",
                  fontSize: 15,
                  color: "#111110",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#534AB7";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E8E6F0";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  color: "#9B9A94",
                  padding: 0,
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        ) : null}

        {mode === "login" ? (
          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => {
                setMode("reset");
                setError("");
                setSuccess("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#534AB7",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Forgot password?
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }} />
        )}

        {error ? (
          <div
            style={{
              background: "#FCEBEB",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: "#791F1F",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            style={{
              background: "#E1F5EE",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: "#1D5C3A",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {success}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            background: submitting ? "#9B9A94" : "#534AB7",
            color: "white",
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            marginBottom: 16,
            transition: "background 0.15s",
          }}
        >
          {submitting
            ? "Please wait..."
            : mode === "login"
              ? "Log in"
              : mode === "signup"
                ? "Create my account"
                : "Send reset link"}
        </button>

        {mode === "reset" ? (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess("");
            }}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              background: "transparent",
              color: "#534AB7",
              border: "1.5px solid #E8E6F0",
              fontSize: 14,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            Back to login
          </button>
        ) : null}

        {mode !== "reset" ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#E8E6F0" }} />
              <span style={{ fontSize: 12, color: "#9B9A94", flexShrink: 0 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: "#E8E6F0" }} />
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                background: "white",
                border: "1.5px solid #E8E6F0",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: "#111110",
                marginBottom: 20,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#534AB7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E8E6F0";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
                />
                <path
                  fill="#34A853"
                  d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
                />
                <path
                  fill="#FBBC05"
                  d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
                />
                <path
                  fill="#EA4335"
                  d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
                />
              </svg>
              Continue with Google
            </button>
          </>
        ) : null}

        {mode === "signup" ? (
          <p
            style={{
              fontSize: 11,
              color: "#9B9A94",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            By signing up you agree to our{" "}
            <a href="/legal/terms" target="_blank" rel="noreferrer" style={{ color: "#534AB7" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="/legal/privacy" target="_blank" rel="noreferrer" style={{ color: "#534AB7" }}>
              Privacy Policy
            </a>
            .
            <br />
            We collect only financial numbers. No PAN or Aadhaar ever.
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 16,
          }}
        >
          <span style={{ fontSize: 12 }} aria-hidden>
            🔐
          </span>
          <span style={{ fontSize: 11, color: "#9B9A94" }}>256-bit encrypted · Secured by Supabase</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
