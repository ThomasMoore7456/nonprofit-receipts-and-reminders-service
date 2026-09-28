import { sendDonorReceipt } from "../src/receipt_sender.js";
import { sendVolunteerReminder } from "../src/volunteer_reminder.js";

const donorEmail = process.env.DEMO_DONOR_EMAIL;
const volunteerEmail = process.env.DEMO_VOLUNTEER_EMAIL;

if (!donorEmail || !volunteerEmail) {
  throw new Error("DEMO_DONOR_EMAIL and DEMO_VOLUNTEER_EMAIL are required");
}

const receipt = await sendDonorReceipt({
  donationId: "DON-2026-001",
  campaignId: "SPRING-DRIVE",
  donorEmail,
  donorName: "Alex Rivera",
  amountCents: 5000,
  donatedAt: "2026-09-13",
  taxYear: 2026,
  nonprofitName: "Community Food Shelf"
});

console.log("receipt report", receipt);

const reminder = await sendVolunteerReminder({
  campaignId: "SPRING-DRIVE",
  volunteerEmail,
  volunteerName: "Jordan Lee",
  shiftStartsAt: "2026-09-20T09:00:00Z",
  location: "123 Harbor St",
  coordinatorName: "Mina Patel"
});

console.log("volunteer reminder report", reminder);
