"use client";

import { useState } from "react";

interface ConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentModal({ onAccept, onDecline }: ConsentModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "22px 18px",
          maxWidth: 480,
          width: "100%",
          margin: "8px auto",
          maxHeight: "calc(100vh - 24px)",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#EEEDFE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            fontSize: 28,
          }}
        >
          🔒
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          Your data is safe with us
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "#5F5E5A",
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          Before we start, here is exactly what we collect and how we use it.
        </p>

        <div
          style={{
            background: "#F7F7F4",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#534AB7",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            What we collect
          </div>

          {[
            "Income and salary numbers",
            "Monthly expense amounts",
            "Loan EMI amounts",
            "Insurance premium amounts",
            "Savings and investment values",
            "Age, city, and life stage",
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#E1F5EE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 11,
                  color: "#1D9E75",
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: "#5F5E5A",
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#FFF8F0",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 16,
            border: "1px solid #FAEEDA",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#BA7517",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            We never ask for
          </div>

          {[
            "PAN card or Aadhaar number",
            "Bank account or IFSC details",
            "Credit or debit card numbers",
            "Passwords or OTPs",
            "Any government ID or document",
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#FCEBEB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 11,
                  color: "#E24B4A",
                  fontWeight: 700,
                }}
              >
                ✗
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: "#5F5E5A",
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#EEEDFE",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "#3C3489", lineHeight: 1.6, margin: 0 }}>
            Your data is used only to calculate your financial analysis and generate your personalized plan.
            We do not sell your personal financial data.
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span style={{ fontSize: 13, color: "#5F5E5A", lineHeight: 1.5 }}>
            I understand and consent to Finkoin processing my entered financial data for analysis.
          </span>
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onDecline}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              border: "1px solid #E8E6F0",
              background: "white",
              color: "#5F5E5A",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Decline
          </button>
          <button
            type="button"
            disabled={!checked}
            onClick={onAccept}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              border: "none",
              background: checked ? "#534AB7" : "#CFCDEA",
              color: "white",
              fontWeight: 700,
              cursor: checked ? "pointer" : "not-allowed",
            }}
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}
