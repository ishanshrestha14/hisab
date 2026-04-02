import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Hisab <noreply@hisab.app>";

export async function sendInvoiceEmail(opts: {
  to: string;
  clientName: string;
  freelancerName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: Date;
  portalUrl: string;
}) {
  const due = new Date(opts.dueDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: opts.currency,
  }).format(opts.total);

  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Invoice ${opts.invoiceNumber} from ${opts.freelancerName} — ${amount} due ${due}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 40px 0;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="background: #f59e0b; padding: 24px 32px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">हिसाब Hisab</h1>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Hi ${opts.clientName},</p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151;">
        ${opts.freelancerName} has sent you invoice <strong>${opts.invoiceNumber}</strong> for <strong>${amount}</strong>, due on <strong>${due}</strong>.
      </p>
      <a href="${opts.portalUrl}" style="display: inline-block; background: #f59e0b; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
        View &amp; Pay Invoice
      </a>
      <p style="margin: 32px 0 0; font-size: 13px; color: #9ca3af;">
        If the button doesn't work, copy this link into your browser:<br/>
        <a href="${opts.portalUrl}" style="color: #f59e0b;">${opts.portalUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

export async function sendPaidNotificationEmail(opts: {
  to: string;
  freelancerName: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
}) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: opts.currency,
  }).format(opts.total);

  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Payment received — ${opts.invoiceNumber} marked as paid`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 40px 0;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="background: #f59e0b; padding: 24px 32px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">हिसाब Hisab</h1>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Hi ${opts.freelancerName},</p>
      <p style="margin: 0 0 8px; font-size: 15px; color: #374151;">
        Great news! <strong>${opts.clientName}</strong> has marked invoice <strong>${opts.invoiceNumber}</strong> as paid.
      </p>
      <p style="margin: 0 0 24px; font-size: 22px; font-weight: 700; color: #059669;">${amount} received</p>
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        Log in to Hisab to view your updated invoice and dashboard.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
