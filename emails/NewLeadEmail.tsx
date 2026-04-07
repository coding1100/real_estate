import { Hr, Section, Text } from "@react-email/components";
import { EmailChrome } from "./EmailChrome";
import { emailTheme } from "./theme";

export type LeadFieldRow = { label: string; value: string };

export type NewLeadEmailProps = {
  leadType: string;
  domainHostname: string;
  pageSlug: string;
  brandName: string;
  fieldRows: LeadFieldRow[];
};

export default function NewLeadEmail({
  leadType,
  domainHostname,
  pageSlug,
  brandName,
  fieldRows,
}: NewLeadEmailProps) {
  const previewText = `New ${leadType} lead — ${domainHostname} / ${pageSlug}`;

  return (
    <EmailChrome
      previewText={previewText}
      title={`New ${leadType} lead`}
      subtitle={`${brandName} · ${domainHostname}`}
    >
      <Section
        style={{
          backgroundColor: emailTheme.accentSoft,
          borderRadius: "8px",
          padding: "14px 16px",
          marginBottom: "20px",
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 600,
            color: emailTheme.accentDark,
            letterSpacing: "0.02em",
          }}
        >
          Submission details
        </Text>
        <Text style={{ margin: "6px 0 0", fontSize: "14px", color: emailTheme.ink }}>
          <strong style={{ color: emailTheme.muted }}>Page</strong>{" "}
          <span style={{ fontFamily: "ui-monospace, monospace" }}>{pageSlug}</span>
        </Text>
      </Section>

      <Text
        style={{
          margin: "0 0 16px",
          fontSize: "15px",
          lineHeight: 1.6,
          color: emailTheme.ink,
        }}
      >
        Here is everything the visitor submitted. Reply directly to this email thread if your
        client supports it, or reach out using the contact details below.
      </Text>

      <Hr style={{ borderColor: emailTheme.line, margin: "0 0 16px" }} />

      {fieldRows.length === 0 ? (
        <Text style={{ margin: 0, fontSize: "14px", color: emailTheme.muted, fontStyle: "italic" }}>
          No additional fields were submitted.
        </Text>
      ) : (
        fieldRows.map((row, i) => (
          <Section
            key={`${row.label}-${i}`}
            style={{
              marginBottom: "10px",
              paddingBottom: "10px",
              borderBottom:
                i < fieldRows.length - 1 ? `1px solid ${emailTheme.line}` : "none",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: emailTheme.muted,
              }}
            >
              {row.label}
            </Text>
            <Text
              style={{
                margin: "4px 0 0",
                fontSize: "15px",
                lineHeight: 1.5,
                color: emailTheme.ink,
                wordBreak: "break-word",
              }}
            >
              {row.value || "—"}
            </Text>
          </Section>
        ))
      )}
    </EmailChrome>
  );
}
