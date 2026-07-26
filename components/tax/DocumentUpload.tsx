"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

const DOCUMENT_TYPES = [
  {
    id: "form16",
    label: "Form 16",
    description: "From your employer",
    icon: "📄",
    required: true,
  },
  {
    id: "ais",
    label: "AIS / Form 26AS",
    description: "From income tax portal",
    icon: "🏛️",
    required: false,
  },
  {
    id: "salary_slip",
    label: "Salary Slips",
    description: "Monthly slips",
    icon: "💰",
    required: false,
  },
  {
    id: "capital_gains",
    label: "Capital Gains",
    description: "Broker/MF .xlsx or PDF",
    icon: "📈",
    required: false,
  },
  {
    id: "esop_rsu",
    label: "ESOP/RSU",
    description: "Vesting statement",
    icon: "💼",
    required: false,
  },
] as const;

type UploadedFile = {
  file: File;
  docType: string;
  id: string;
};

type Props = {
  onExtracted: (data: Record<string, unknown>) => void;
  onWarnings: (w: string[]) => void;
};

function friendlyApiError(status: number, serverMessage?: string): string {
  if (status === 401) {
    return (
      serverMessage ||
      "Session not found on the server. Sign out, sign back in, then retry."
    );
  }
  if (status === 503) {
    return (
      serverMessage ||
      "Tax extraction is not configured (missing GROQ_API_KEY on the server)."
    );
  }
  if (status === 429) {
    return "Too many uploads — wait a minute and try again.";
  }
  return serverMessage || `Extraction failed (${status})`;
}

export default function DocumentUpload({ onExtracted, onWarnings }: Props) {
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [selectedType, setSelectedType] = useState("form16");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onDrop = useCallback(
    (files: File[]) => {
      setError(null);
      const newUploads = files.map((f) => {
        const isSheet = /\.(xlsx|xls|csv)$/i.test(f.name);
        return {
          file: f,
          docType:
            isSheet && (selectedType === "form16" || selectedType === "unknown")
              ? "capital_gains"
              : selectedType,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
      });
      setUploads((prev) => [...prev, ...newUploads]);
    },
    [selectedType],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const reasons = rejections.flatMap((r) =>
      r.errors.map((e) => `${r.file.name}: ${e.message}`),
    );
    setError(
      reasons[0] || "File rejected. Use PDF, JPG, PNG, XLSX or CSV under 10MB.",
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const processDocuments = async () => {
    if (!uploads.length || processing) return;

    setProcessing(true);
    setError(null);
    setProgress("Reading your documents…");

    try {
      const formData = new FormData();
      uploads.forEach((u) => {
        formData.append("files", u.file);
        formData.append("types", u.docType);
      });

      setProgress("Extracting tax information… this can take up to a minute");

      // Prefer Bearer from the browser session — UI can look signed-in via
      // localStorage while API cookie session is missing (common on localhost).
      const headers: HeadersInit = {};
      try {
        const { getSupabase } = await import("@/lib/supabase");
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        } else {
          throw new Error(
            "Your login session expired. Sign out, sign back in, then retry auto-fill.",
          );
        }
      } catch (sessionErr) {
        if (
          sessionErr instanceof Error &&
          sessionErr.message.includes("Sign out")
        ) {
          throw sessionErr;
        }
        /* cookie auth may still work if supabase client failed to load */
      }

      const res = await fetch("/api/tax/extract", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });

      let data: {
        error?: string;
        extracted?: Record<string, unknown>;
        warnings?: string[];
        missingFields?: string[];
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error(
          res.ok
            ? "Server returned an empty response"
            : friendlyApiError(res.status),
        );
      }

      if (!res.ok) {
        throw new Error(friendlyApiError(res.status, data.error));
      }

      const extracted = data.extracted || {};
      const keys = Object.keys(extracted).filter(
        (k) => extracted[k] != null && extracted[k] !== "",
      );
      if (keys.length === 0) {
        const detail = (data.warnings || []).filter(Boolean).join(" ");
        throw new Error(
          detail ||
            "No tax numbers could be read from this file. Use a text PDF or .xlsx (Capital Gains type), or a clear JPG/PNG photo of Form 16.",
        );
      }

      setProgress("Documents read and discarded ✓");

      const warnings = [...(data.warnings || [])];
      if (data.missingFields?.length) {
        warnings.push(`Missing: ${data.missingFields.join(", ")}`);
      }
      onWarnings(warnings);
      onExtracted(extracted);
      setUploads([]);
      setDone(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setProgress("");
      // Keep uploads so the user can retry without re-selecting files
    } finally {
      setProcessing(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          background: "#E1F5EE",
          borderRadius: 14,
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#1D5C3A",
            marginBottom: 6,
          }}
        >
          Documents read successfully
        </div>
        <div style={{ fontSize: 13, color: "#1D5C3A" }}>
          All files discarded. Only your tax numbers have been extracted and
          will be used to fill the form.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {DOCUMENT_TYPES.map((dt) => (
          <button
            key={dt.id}
            type="button"
            onClick={() => setSelectedType(dt.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: `1.5px solid ${
                selectedType === dt.id ? "#534AB7" : "#E8E6F0"
              }`,
              background: selectedType === dt.id ? "#EEEDFE" : "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: selectedType === dt.id ? "#534AB7" : "#5F5E5A",
            }}
          >
            <span>{dt.icon}</span>
            <span>{dt.label}</span>
            {dt.required ? (
              <span style={{ color: "#E24B4A", fontSize: 10 }}>*</span>
            ) : null}
          </button>
        ))}
      </div>

      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#534AB7" : "#E8E6F0"}`,
          borderRadius: 14,
          padding: "32px 20px",
          textAlign: "center",
          background: isDragActive ? "#EEEDFE" : "#FAFAFE",
          cursor: "pointer",
          transition: "all 0.2s",
          marginBottom: 16,
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#534AB7",
            marginBottom: 6,
          }}
        >
          {isDragActive
            ? "Drop files here"
            : `Upload ${
                DOCUMENT_TYPES.find((d) => d.id === selectedType)?.label ||
                "document"
              }`}
        </div>
        <div style={{ fontSize: 12, color: "#9B9A94" }}>
          PDF, JPG, PNG, XLSX or CSV · Max 10MB each
          {selectedType === "capital_gains"
            ? " · Broker capital gains/loss exports welcome"
            : ""}
        </div>
      </div>

      {uploads.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          {uploads.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "white",
                borderRadius: 10,
                border: "1px solid #E8E6F0",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 20 }}>
                {DOCUMENT_TYPES.find((d) => d.id === u.docType)?.icon || "📄"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#111110",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {u.file.name}
                </div>
                <div style={{ fontSize: 11, color: "#9B9A94" }}>
                  {DOCUMENT_TYPES.find((d) => d.id === u.docType)?.label} ·{" "}
                  {(u.file.size / 1024).toFixed(0)}KB
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remove ${u.file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(u.id);
                }}
                style={{
                  background: "#FCEBEB",
                  border: "none",
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  color: "#E24B4A",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          background: "#F7F7F4",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 16,
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: 16 }}>🔒</span>
        <div style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.5 }}>
          <strong>Your documents are safe.</strong> Files are read in memory
          only. Never stored on our servers. Discarded immediately after
          extraction. Only your tax numbers are saved, encrypted.
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            background: "#FCEBEB",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "#791F1F",
            lineHeight: 1.5,
          }}
        >
          <strong>Couldn’t auto-fill.</strong> {error}
        </div>
      ) : null}

      {processing && progress ? (
        <div
          style={{
            background: "#EEEDFE",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "#534AB7",
            fontWeight: 600,
          }}
        >
          {progress}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void processDocuments()}
        disabled={!uploads.length || processing}
        style={{
          width: "100%",
          height: 52,
          background: !uploads.length || processing ? "#9B9A94" : "#534AB7",
          color: "white",
          border: "none",
          borderRadius: 13,
          fontSize: 15,
          fontWeight: 700,
          cursor: !uploads.length || processing ? "not-allowed" : "pointer",
        }}
      >
        {processing
          ? "Working…"
          : `Read ${uploads.length} document${
              uploads.length !== 1 ? "s" : ""
            } and auto-fill`}
      </button>
    </div>
  );
}
