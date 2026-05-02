export default function DisclaimerPage() {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "40px 24px 80px",
      }}
    >
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        Disclaimer
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#9B9A94",
          marginBottom: 32,
        }}
      >
        Last updated: May 1, 2026
      </p>

      <div
        style={{
          background: "#FFF8F0",
          border: "1px solid #FAEEDA",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 32,
          fontSize: 15,
          color: "#633806",
          lineHeight: 1.7,
        }}
      >
        <strong>Important:</strong> Finkoin is an educational platform. Nothing on this site constitutes professional financial, investment, tax, or legal advice.
      </div>

      {[
        {
          title: "Not Investment Advice",
          content:
            "Finkoin is not a SEBI-registered Investment Advisor (RIA). The analysis, scores, and recommendations provided are algorithmic and educational in nature. They do not constitute professional investment advice. Past performance of any investment product mentioned does not guarantee future results. All investments are subject to market risks.",
        },
        {
          title: "Not Insurance Advice",
          content:
            "Finkoin is not an IRDAI-licensed insurance advisor or broker. Insurance product mentions are for educational illustration only. Consult an IRDAI-licensed advisor before purchasing any insurance product.",
        },
        {
          title: "Not Tax Advice",
          content:
            "Tax calculations on Finkoin are estimates based on information provided and general tax rules. Tax laws change frequently. Consult a qualified Chartered Accountant (CA) for your specific tax situation.",
        },
        {
          title: "Accuracy of Information",
          content:
            "While we strive for accuracy, Finkoin does not guarantee the accuracy, completeness, or timeliness of any information on this platform. Financial analysis is only as accurate as the data you provide.",
        },
        {
          title: "Your Responsibility",
          content:
            "You are solely responsible for all financial decisions you make. Finkoin's analysis is one input among many that you should consider. Always do your own research and consult qualified professionals.",
        },
      ].map((section, i) => (
        <div key={i} style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#111110",
              marginBottom: 10,
            }}
          >
            {section.title}
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#5F5E5A",
              lineHeight: 1.8,
            }}
          >
            {section.content}
          </p>
        </div>
      ))}
    </div>
  );
}
