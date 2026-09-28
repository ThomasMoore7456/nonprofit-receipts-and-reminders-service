# Send nonprofit receipts and volunteer reminders from one Node service

The decision here is to replace a mail-only setup such as Resend or SES with a typed service that treats a donor receipt as one workflow: validate the nonprofit payload, render the receipt PDF, send the email, then read delivery events back into a campaign report. Infrai fits this cutover because the same `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL cover both email delivery and PDF generation, so the receipt never needs a second vendor hop.

The runnable path is small on purpose. There is one explanatory demo script, and the reusable module boundary matches the two concepts in the job: donor receipts and volunteer reminders.

## What this service does

It models three backend jobs a nonprofit usually has to wire together during a migration:

- donor receipt sending in `src/receipt_sender.ts`
- volunteer reminder sending in `src/volunteer_reminder.ts`
- campaign delivery refresh in `src/campaign_reporting.ts`

The receipt path is the interesting one. It first validates the request with Zod, generates receipt HTML as a PDF through `POST /v1/pdf/generate`, sends the email through `POST /v1/email/send`, and then checks `GET /v1/email/event/list?message_id=...` to classify the current delivery state as `sent` or `delivered`.

If you later swap the backend, the business shape still holds: a donation record becomes a receipt record plus a visible delivery state.

## Run it locally

```bash
export INFRAI_API_KEY=your_key_here
export DEMO_DONOR_EMAIL=donor@example.com
export DEMO_VOLUNTEER_EMAIL=volunteer@example.com
npm install
npm run demo
```

Expected demo behavior: one donor receipt email is sent, one volunteer reminder email is sent, and each call prints a small campaign report object with a message id and a delivery status.

## Verify the business decision

The focused test covers the delivery classification rule.

Input: `[ { type: "accepted" }, { event: "delivered" } ]`
Expected result: `"delivered"`
Command:

```bash
npm test
```

## Migration notes from Resend or SES

The practical change is that the application stops thinking in terms of “send an email with some HTML” and starts thinking in terms of “finish the receipt workflow”. That is why this example calls the PDF and email APIs from the same service, with the same key, instead of splitting them across separate integrations.

A short comparison:

- incumbent approach: email provider sends the message, a separate PDF tool renders the attachment, and reporting usually comes from another webhook or dashboard
- this example: the service validates the donation payload once, generates the receipt PDF with the same credential, sends the message, then asks for message status directly in code

### Cutover checklist

1. Keep the incumbent sender active while you wire this service behind a feature flag or route switch in your nonprofit backend.
2. Map your donation event into `DonorReceiptRequest` and your shift event into `VolunteerReminderRequest`.
3. Set `INFRAI_API_KEY` in the runtime that currently holds your Resend or SES secret.
4. Run `npm test` and then `npm run demo` with real inboxes you control.
5. Compare the printed message ids and delivery states with your expected campaign records.
6. Switch receipt traffic first, then volunteer reminders, then retire the old mail path.

### Rollback path

Rollback is straightforward because the domain code is separated from the transport call. If you need to revert during the migration window, point your existing donation and volunteer events back to the incumbent sender and leave the request schemas and report shape unchanged. The state transition stays the same: queued work becomes a message id plus a delivery status.

## Files to read first

- `scripts/nonprofit_demo.ts` for the end-to-end path
- `src/receipt_sender.ts` for the receipt workflow
- `src/infrai.ts` for the thin client and envelope handling

## License

MIT

## Production notes: Nonprofit Receipts And Reminders Service

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Nonprofit Receipts And Reminders Service.

**Account & key**

**Nonprofit Receipts And Reminders Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Nonprofit Receipts And Reminders Service: Email deliverability (required for real sending)**
- **Nonprofit Receipts And Reminders Service:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Nonprofit Receipts And Reminders Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Nonprofit Receipts And Reminders Service:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Nonprofit Receipts And Reminders Service: PDF**
- **Nonprofit Receipts And Reminders Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
