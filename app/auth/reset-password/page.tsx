"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }

    const supabase = getSupabase();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      },
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 16,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }} aria-hidden>
          <AppIcon name="mail" size={44} color="#534AB7" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111110" }}>
          Check your email
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#9B9A94",
            textAlign: "center",
            maxWidth: 320,
          }}
        >
          We sent a password reset link to {email}. Open it on this device to
          choose a new password.
        </p>
        <Link href="/login" style={{ color: "#534AB7", fontWeight: 600 }}>
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
        background: "#F7F7F4",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "40px 32px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 4px 40px rgba(0,0,0,0.06)",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 8,
            color: "#111110",
          }}
        >
          Reset password
        </h1>
        <p style={{ fontSize: 14, color: "#9B9A94", marginBottom: 24 }}>
          Enter your email and we will send a secure reset link.
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            border: "1.5px solid #E8E6F0",
            padding: "0 16px",
            fontSize: 15,
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />

        {error ? (
          <div
            style={{
              background: "#FCEBEB",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#791F1F",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleReset()}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            background: "#534AB7",
            color: "white",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Send reset link →
        </button>

        <p style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
          <Link href="/login" style={{ color: "#534AB7" }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
