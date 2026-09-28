import { z } from "zod";

export const donorReceiptRequestSchema = z.object({
  donationId: z.string().min(1),
  campaignId: z.string().min(1),
  donorEmail: z.string().email(),
  donorName: z.string().min(1),
  amountCents: z.number().int().positive(),
  donatedAt: z.string().min(1),
  taxYear: z.number().int().min(2000),
  nonprofitName: z.string().min(1)
});

export const volunteerReminderRequestSchema = z.object({
  campaignId: z.string().min(1),
  volunteerEmail: z.string().email(),
  volunteerName: z.string().min(1),
  shiftStartsAt: z.string().min(1),
  location: z.string().min(1),
  coordinatorName: z.string().min(1)
});

export type DonorReceiptRequest = z.infer<typeof donorReceiptRequestSchema>;
export type VolunteerReminderRequest = z.infer<typeof volunteerReminderRequestSchema>;

export type CampaignReport = {
  campaignId: string;
  receiptMessageId?: string;
  receiptStatus?: "queued" | "sent" | "delivered";
  volunteerReminderMessageId?: string;
  volunteerReminderStatus?: "queued" | "sent" | "delivered";
  generatedAt: string;
};
