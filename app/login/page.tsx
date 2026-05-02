"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/analyse";

  const { signInWithEmail, signUpWithEmail, isLoggedIn, isLoading } = useAuthStore();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(redirect);
    }
  }, [isLoggedIn, redirect, router]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (!email || !password) {
      setError("Please fill all fields");
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be 6+ characters");
      setSubmitting(false);
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Please enter your name");
        setSubmitting(false);
        return;
      }

      const { error: signUpErr } = await signUpWithEmail(email, password, name.trim());

      if (signUpErr) {
        setError(signUpErr);
      } else {
        setSuccess("Account created! Check your email to verify, then sign in.");
        setMode("login");
      }
    } else {
      const { error: signInErr } = await signInWithEmail(email, password);

      if (signInErr) {
        setError(signInErr.toLowerCase().includes("invalid") ? "Wrong email or password" : signInErr);
      } else {
        router.replace(redirect);
      }
    }

    setSubmitting(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F7F4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "40px 32px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 4px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
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
          <span style={{ fontSize: 20, fontWeight: 800, color: "#534AB7" }}>Finkoin</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111110", marginBottom: 8 }}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>

        <p style={{ fontSize: 14, color: "#9B9A94", marginBottom: 28 }}>
          {mode === "login" ? "Login to access your financial plan" : "Join thousands managing finances with Finkoin"}
        </p>

        <div
          style={{
            display: "flex",
            background: "#F7F7F4",
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}
        >
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setSuccess("");
              }}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9,
                border: "none",
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "#534AB7" : "#9B9A94",
                fontWeight: mode === m ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {m === "login" ? "Login" : "Sign up"}
            </button>
          ))}
        </div>

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
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "1.5px solid #E8E6F0",
                padding: "0 16px",
                fontSize: 15,
                color: "#111110",
                background: "white",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ) : null}

        <div style={{ marginBottom: 16 }}>
          <label
            style={{ fontSize: 13, fontWeight: 600, color: "#5F5E5A", display: "block", marginBottom: 6 }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1.5px solid #E8E6F0",
              padding: "0 16px",
              fontSize: 15,
              color: "#111110",
              background: "white",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ fontSize: 13, fontWeight: 600, color: "#5F5E5A", display: "block", marginBottom: 6 }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
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
                background: "white",
                outline: "none",
                boxSizing: "border-box",
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
                fontSize: 16,
                color: "#9B9A94",
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {mode === "login" ? (
            <Link
              href="/auth/reset-password"
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 12,
                color: "#534AB7",
              }}
            >
              Forgot password?
            </Link>
          ) : null}
        </div>

        {error ? (
          <div
            style={{
              background: "#FCEBEB",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: "#791F1F",
              marginBottom: 16,
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
            }}
          >
            {success}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || isLoading}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            background: submitting || isLoading ? "#9B9A94" : "#534AB7",
            color: "white",
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            cursor: submitting || isLoading ? "not-allowed" : "pointer",
            marginBottom: 16,
            transition: "background 0.15s",
          }}
        >
          {submitting ? "Please wait..." : mode === "login" ? "Login to Finkoin →" : "Create my account →"}
        </button>

        {mode === "signup" ? (
          <p style={{ fontSize: 11, color: "#9B9A94", textAlign: "center", lineHeight: 1.6 }}>
            By creating an account you agree to our{" "}
            <Link href="/legal/terms" style={{ color: "#534AB7" }}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" style={{ color: "#534AB7" }}>
              Privacy Policy
            </Link>
            . We collect only financial numbers — no PAN or Aadhaar in the signup form.
          </p>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#E8E6F0" }} />
          <span style={{ fontSize: 12, color: "#9B9A94" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "#E8E6F0" }} />
        </div>

        <button
          type="button"
          onClick={async () => {
            const { default: getSb } = await import("@/lib/supabase");
            const supabase = getSb();
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            });
          }}
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
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F4] text-sm text-[#9B9A94]">
          Loading…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
