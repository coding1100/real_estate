import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "./prisma";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

export async function sendLeadNotifications(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      domain: true,
      page: true,
    },
  });

  if (!lead) return;

  const { domain, page } = lead;

  // Email to agent via Resend
  if (resend && domain.notifyEmail) {
    try {
      const subject = `[New ${lead.type} lead] ${domain.hostname} / ${page.slug}`;
      const lines: string[] = [];
      const data = lead.formData as any;

      Object.keys(data || {}).forEach((key) => {
        if (["recaptchaToken", "website"].includes(key)) return;
        lines.push(`${key}: ${data[key]}`);
      });

      const textBody = [
        `New ${lead.type} lead from ${domain.hostname}`,
        `Page: ${page.slug}`,
        "",
        ...lines,
      ].join("\n");

      await resend.emails.send({
        from: "leads@no-reply.example.com",
        to: domain.notifyEmail,
        subject,
        text: textBody,
      });
    } catch (e) {
      console.error("[notifications] Failed to send email", e);
    }
  }

  // SMS to agent via Twilio
  if (twilioClient && TWILIO_FROM_NUMBER && domain.notifySms) {
    try {
      await twilioClient.messages.create({
        from: TWILIO_FROM_NUMBER,
        to: domain.notifySms,
        body: `New ${lead.type} lead from ${domain.hostname} / ${page.slug}`,
      });
    } catch (e) {
      console.error("[notifications] Failed to send SMS", e);
    }
  }
}

