import { infrai } from "./infrai.js";
import { volunteerReminderRequestSchema, type CampaignReport, type VolunteerReminderRequest } from "./nonprofit_types.js";
import { classifyDelivery } from "./receipt_sender.js";

function buildVolunteerReminderHtml(input: VolunteerReminderRequest) {
  return `
    <p>Hi ${input.volunteerName},</p>
    <p>This is a reminder for your upcoming shift.</p>
    <ul>
      <li>Campaign ID: ${input.campaignId}</li>
      <li>Starts: ${input.shiftStartsAt}</li>
      <li>Location: ${input.location}</li>
      <li>Coordinator: ${input.coordinatorName}</li>
    </ul>
  `.trim();
}

export async function sendVolunteerReminder(input: VolunteerReminderRequest): Promise<CampaignReport> {
  const valid = volunteerReminderRequestSchema.parse(input);

  const emailResult = await infrai.email.send(
    {
      to: valid.volunteerEmail,
      subject: `Volunteer reminder for ${valid.shiftStartsAt}`,
      html: buildVolunteerReminderHtml(valid)
    },
    { "Idempotency-Key": `volunteer:${valid.campaignId}:${valid.volunteerEmail}` }
  );

  const eventsResult = await infrai.email.event.list(emailResult.data.message_id);
  const volunteerReminderStatus = classifyDelivery(eventsResult.data.items);

  return {
    campaignId: valid.campaignId,
    volunteerReminderMessageId: emailResult.data.message_id,
    volunteerReminderStatus,
    generatedAt: new Date().toISOString()
  };
}
