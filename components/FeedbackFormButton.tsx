"use client";

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeenhOEAOJdHPu_pkz2tc4imGI_x9zKgrlvFNnCa1f5AEKXkg/viewform?usp=header";

export default function FeedbackFormButton() {
  return (
    <a
      href={GOOGLE_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: "#EEEDFE",
        borderRadius: 10,
        color: "#534AB7",
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
        border: "1px solid #AFA9EC",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Share feedback
    </a>
  );
}
