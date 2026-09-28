import { infrai } from "./infrai.js";
import { donorReceiptRequestSchema, type CampaignReport, type DonorReceiptRequest } from "./nonprofit_types.js";

export function classifyDelivery(events: Array<Record<string, unknown>>): "sent" | "delivered" {
  for (const event of events) {
    const values = Object.values(event).map((value) => String(value).toLowerCase());
    if (values.includes("delivered")) {
      return "delivered";
    }
  }
  return "sent";
}

function formatMoney(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function buildReceiptHtml(input: DonorReceiptRequest) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h1>${input.nonprofitName} donation receipt</h1>
        <p>Thank you, ${input.donorName}. We received your donation on ${input.donatedAt}.</p>
        <ul>
          <li>Donation ID: ${input.donationId}</li>
          <li>Campaign ID: ${input.campaignId}</li>
          <li>Amount: ${formatMoney(input.amountCents)}</li>
          <li>Tax year: ${input.taxYear}</li>
        </ul>
      </body>
    </html>
  `.trim();
}

function buildReceiptEmailHtml(input: DonorReceiptRequest) {
  return `
    <p>Hi ${input.donorName},</p>
    <p>Thanks for supporting ${input.nonprofitName}. This email is your receipt for ${formatMoney(input.amountCents)}.</p>
    <p>Donation ID: <b>${input.donationId}</b><br/>Campaign ID: <b>${input.campaignId}</b><br/>Tax year: <b>${input.taxYear}</b></p>
    <p>Your accounting archive can regenerate the same receipt PDF from the same transaction record, using the same INFRAI_API_KEY and base URL.</p>
  `.trim();
}

export async function sendDonorReceipt(input: DonorReceiptRequest): Promise<CampaignReport> {
  const valid = donorReceiptRequestSchema.parse(input);

  const receiptHtml = buildReceiptHtml(valid);
  await infrai.pdf.generate(receiptHtml ? {
    html: receiptHtml,
    page_size: "A4",
    orientation: "portrait",
    store: false
  } : {});

  const emailResult = await infrai.email.send(
    {
      to: valid.donorEmail,
      subject: `${valid.nonprofitName} receipt for ${formatMoney(valid.amountCents)}`,
      html: buildReceiptEmailHtml(valid)
    },
    { "Idempotency-Key": `receipt:${valid.donationId}` }
  );

  const eventsResult = await infrai.email.event.list(emailResult.data.message_id);
  const receiptStatus = classifyDelivery(eventsResult.data.items);

  return {
    campaignId: valid.campaignId,
    receiptMessageId: emailResult.data.message_id,
    receiptStatus,
    generatedAt: new Date().toISOString()
  };
}
