import { infrai } from "./infrai.js";
import type { CampaignReport } from "./nonprofit_types.js";
import { classifyDelivery } from "./receipt_sender.js";

export async function refreshReceiptReport(campaignId: string, receiptMessageId: string): Promise<CampaignReport> {
  await infrai.email.get(receiptMessageId);
  const eventsResult = await infrai.email.event.list(receiptMessageId);

  return {
    campaignId,
    receiptMessageId,
    receiptStatus: classifyDelivery(eventsResult.data.items),
    generatedAt: new Date().toISOString()
  };
}
