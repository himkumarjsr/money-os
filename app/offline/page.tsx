"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        textAlign: "center",
        background: "#F7F7F4",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: "#534AB7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          color: "white",
          fontWeight: 800,
          marginBottom: 24,
        }}
      >
        FK
      </div>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#111110",
          marginBottom: 12,
        }}
      >
        You are offline
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "#5F5E5A",
          lineHeight: 1.6,
          maxWidth: 300,
          marginBottom: 32,
        }}
      >
        No internet connection. Your previously viewed pages are still accessible.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          height: 48,
          padding: "0 28px",
          borderRadius: 12,
          background: "#534AB7",
          color: "white",
          border: "none",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        Try again
      </button>

      <Link
        href="/"
        style={{
          fontSize: 14,
          color: "#534AB7",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Go to home page →
      </Link>
    </div>
  );
}
