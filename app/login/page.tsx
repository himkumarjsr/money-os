"use client";

import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { initAuth } = useAuthStore();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    if (mode === "signup" && !name) {
      setError("Please enter your name");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    if (mode === "signup") {
      const { error: signUpError } = await signUpWithEmail(email, password, name);
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: signInError } = await signInWithEmail(email, password);
      if (signInError) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
    }

    await initAuth();
    router.push("/analyse");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F7F4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "#534AB7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: 20,
              fontWeight: 800,
              color: "white",
            }}
          >
            FK
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111110" }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </div>
          <div style={{ fontSize: 13, color: "#9B9A94", marginTop: 4 }}>
            {mode === "login" ? "Sign in to your Finkoin account" : "Start your financial journey"}
          </div>
        </div>

        <div style={{ display: "flex", background: "#F7F7F4", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "#534AB7" : "#9B9A94",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
              }}
            >
              {m === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        {mode === "signup" ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#5F5E5A", display: "block", marginBottom: 6 }}>
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Himanshu"
              style={{
                width: "100%",
                height: 48,
                border: "1.5px solid #E8E6F0",
                borderRadius: 10,
                padding: "0 14px",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ) : null}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#5F5E5A", display: "block", marginBottom: 6 }}>
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
              border: "1.5px solid #E8E6F0",
              borderRadius: 10,
              padding: "0 14px",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#5F5E5A", display: "block", marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Min 6 characters"
              style={{
                width: "100%",
                height: 48,
                border: "1.5px solid #E8E6F0",
                borderRadius: 10,
                padding: "0 44px 0 14px",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
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
        </div>

        {error ? (
          <div
            style={{
              background: "#FCEBEB",
              border: "1px solid #F7C1C1",
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
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            height: 50,
            background: loading ? "#AFA9EC" : "#534AB7",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : mode === "login" ? "Sign in →" : "Create account →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#9B9A94", lineHeight: 1.6 }}>
          Educational use only. Not SEBI registered advice.
        </div>
      </div>
    </div>
  );
}
