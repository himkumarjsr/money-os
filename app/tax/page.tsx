"use client";

import DocumentUpload from "@/components/tax/DocumentUpload";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import {
  mapExtractedToComparisonInputs,
  populateTaxCalculatorFromExtract,
  type ExtractedTaxData,
} from "@/lib/taxExtract";
import { compareRegimes } from "@/lib/taxRegimeComparisonFY2026";
import Link from "next/link";
import { useMemo, useState } from "react";

type TabId = "upload" | "form" | "result";

function TaxPageContent() {
  const [extractedData, setExtractedData] = useState<ExtractedTaxData | null>(
    null,
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("upload");

  const handleExtracted = (data: ExtractedTaxData) => {
    setExtractedData(data);
    setActiveTab("form");
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "16px 16px 80px",
      }}
    >
      <div
        style={{
          background: "#534AB7",
          borderRadius: 16,
          padding: "20px",
          marginBottom: 20,
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 6,
          }}
        >
          FY 2025-26 · AY 2026-27
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          ITR Auto-fill
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          Upload Form 16. We fill your tax numbers. Free. Secure. Instant.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          background: "white",
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
          border: "1px solid #E8E6F0",
        }}
      >
        {(
          [
            { id: "upload", label: "1. Upload" },
            { id: "form", label: "2. Review" },
            { id: "result", label: "3. Tax" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              height: 40,
              border: "none",
              borderRadius: 10,
              background: activeTab === tab.id ? "#534AB7" : "transparent",
              color: activeTab === tab.id ? "white" : "#9B9A94",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div
          style={{
            background: "#FFF3E0",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#BA7517",
              marginBottom: 6,
            }}
          >
            ⚠️ Review these
          </div>
          {warnings.map((w, i) => (
            <div
              key={`${i}-${w.slice(0, 24)}`}
              style={{
                fontSize: 12,
                color: "#5F5E5A",
                lineHeight: 1.5,
                marginBottom: 4,
              }}
            >
              • {w}
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "upload" ? (
        <DocumentUpload
          onExtracted={handleExtracted}
          onWarnings={setWarnings}
        />
      ) : null}

      {activeTab === "form" && extractedData ? (
        <ExtractedDataReview
          data={extractedData}
          onConfirm={(confirmed) => {
            populateTaxCalculatorFromExtract(confirmed);
            setExtractedData(confirmed);
            setActiveTab("result");
          }}
        />
      ) : null}

      {activeTab === "result" && extractedData ? (
        <TaxCalculationResult data={extractedData} />
      ) : null}
    </div>
  );
}

function ExtractedDataReview({
  data,
  onConfirm,
}: {
  data: ExtractedTaxData;
  onConfirm: (confirmed: ExtractedTaxData) => void;
}) {
  const rows = Object.entries(data).filter(
    ([, v]) => v !== null && typeof v !== "object",
  );

  return (
    <div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#111110",
          marginBottom: 16,
        }}
      >
        Review extracted data
      </div>
      {rows.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 0",
            borderBottom: "1px solid #F7F7F4",
          }}
        >
          <div style={{ fontSize: 13, color: "#5F5E5A" }}>
            {key.replace(/([A-Z])/g, " $1").trim()}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#111110",
              textAlign: "right",
            }}
          >
            {typeof value === "number"
              ? `₹${value.toLocaleString("en-IN")}`
              : String(value)}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onConfirm(data)}
        style={{
          width: "100%",
          height: 50,
          background: "#534AB7",
          color: "white",
          border: "none",
          borderRadius: 13,
          marginTop: 20,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Looks correct → Calculate tax
      </button>
    </div>
  );
}

function TaxCalculationResult({ data }: { data: ExtractedTaxData }) {
  const comparison = useMemo(() => {
    const inputs = mapExtractedToComparisonInputs(data);
    return compareRegimes(inputs);
  }, [data]);

  const taxOld = Math.round(comparison.old.totalTax);
  const taxNew = Math.round(comparison.new.totalTax);
  const savings = Math.abs(taxOld - taxNew);
  const betterRegime = taxOld <= taxNew ? "old" : "new";
  const tds =
    Number(data.tdsFromForm16 ?? data.tdsDeducted ?? data.tdsFromAIS ?? 0) || 0;
  const payable = taxOld - tds;

  return (
    <div>
      <div
        style={{
          background: betterRegime === "new" ? "#E1F5EE" : "#EEEDFE",
          borderRadius: 14,
          padding: "20px",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: betterRegime === "new" ? "#1D5C3A" : "#534AB7",
            marginBottom: 6,
          }}
        >
          {betterRegime === "new"
            ? "New regime saves you more"
            : "Old regime saves you more"}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: betterRegime === "new" ? "#1D9E75" : "#534AB7",
          }}
        >
          Save ₹{savings.toLocaleString("en-IN")}
        </div>
        <div style={{ fontSize: 11, color: "#5F5E5A", marginTop: 8 }}>
          Illustrative FY 2025-26 estimate — not filing advice.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {(
          [
            {
              label: "Old Regime",
              tax: taxOld,
              isBetter: betterRegime === "old",
            },
            {
              label: "New Regime",
              tax: taxNew,
              isBetter: betterRegime === "new",
            },
          ] as const
        ).map((r) => (
          <div
            key={r.label}
            style={{
              background: r.isBetter ? "#534AB7" : "white",
              borderRadius: 14,
              padding: "16px",
              border: "1px solid #E8E6F0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: r.isBetter ? "rgba(255,255,255,0.7)" : "#9B9A94",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: r.isBetter ? "white" : "#111110",
              }}
            >
              ₹{r.tax.toLocaleString("en-IN")}
            </div>
            <div
              style={{
                fontSize: 11,
                color: r.isBetter ? "rgba(255,255,255,0.6)" : "#9B9A94",
                marginTop: 4,
              }}
            >
              tax payable
            </div>
            {r.isBetter ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "white",
                  marginTop: 8,
                  display: "inline-block",
                }}
              >
                ✓ Better for you
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 14,
          border: "1px solid #E8E6F0",
          padding: "16px",
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#111110",
            marginBottom: 12,
          }}
        >
          Tax breakdown (old regime view)
        </div>
        {(
          [
            ["Gross salary", Number(data.grossSalary) || 0],
            ["Ordinary taxable (engine)", comparison.old.taxableIncome ?? 0],
            ["Tax liability (old)", taxOld],
            ["TDS deducted", -tds],
            ["Tax payable / refund", payable],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #F7F7F4",
              fontSize: 13,
            }}
          >
            <span style={{ color: "#5F5E5A" }}>{label}</span>
            <span
              style={{
                fontWeight: 700,
                color: value < 0 ? "#1D9E75" : "#111110",
              }}
            >
              {value < 0
                ? `-₹${Math.abs(value).toLocaleString("en-IN")}`
                : `₹${value.toLocaleString("en-IN")}`}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/calculators/tax-regime-2026"
        style={{
          display: "block",
          marginTop: 16,
          width: "100%",
          height: 50,
          lineHeight: "50px",
          textAlign: "center",
          background: "#EEEDFE",
          color: "#534AB7",
          borderRadius: 13,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Open full tax calculator (pre-filled) →
      </Link>
    </div>
  );
}

export default function TaxPage() {
  return (
    <ProtectedGate>
      <TaxPageContent />
    </ProtectedGate>
  );
}
