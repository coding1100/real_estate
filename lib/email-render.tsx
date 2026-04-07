import { render } from "@react-email/render";
import DocumentDeliveryEmail from "@/emails/DocumentDeliveryEmail";
import NewLeadEmail, { type LeadFieldRow } from "@/emails/NewLeadEmail";

export function formLinesToFieldRows(lines: string[]): LeadFieldRow[] {
  return lines.map((line) => {
    const idx = line.indexOf(": ");
    if (idx === -1) return { label: "Field", value: line };
    return {
      label: line.slice(0, idx).trim() || "Field",
      value: line.slice(idx + 2).trim(),
    };
  });
}

export async function renderNewLeadEmailHtml(props: {
  leadType: string;
  domainHostname: string;
  pageSlug: string;
  brandName: string;
  fieldRows: LeadFieldRow[];
}): Promise<{ html: string; text: string }> {
  const el = (
    <NewLeadEmail
      leadType={props.leadType}
      domainHostname={props.domainHostname}
      pageSlug={props.pageSlug}
      brandName={props.brandName}
      fieldRows={props.fieldRows}
    />
  );
  const [html, text] = await Promise.all([
    render(el),
    render(el, { plainText: true }),
  ]);
  return { html, text };
}

export async function renderDocumentDeliveryEmailHtml(props: {
  siteName: string;
  domainHostname: string;
  pageSlug: string;
  documentNames: string[];
}): Promise<{ html: string; text: string }> {
  const el = (
    <DocumentDeliveryEmail
      siteName={props.siteName}
      domainHostname={props.domainHostname}
      pageSlug={props.pageSlug}
      documentNames={props.documentNames}
    />
  );
  const [html, text] = await Promise.all([
    render(el),
    render(el, { plainText: true }),
  ]);
  return { html, text };
}
