# QuestionStudio — Scan-and-Pay Credit Recharge (Manual UPI + Admin Approval)

Your clients can now recharge credits themselves by scanning your UPI QR —
no payment gateway, no fees. It's kept safe by a simple rule: credits are
only added when YOU approve the payment.

## How it works

1. **You set it up once** — on the new "Recharge Approvals" page, upload
   your UPI QR image and/or enter your UPI ID.
2. **The client pays** — on their new "Recharge Credits" page, they see
   your QR, pay through any UPI app (GPay/PhonePe/Paytm), and enter the
   amount + the reference number their app gives them.
3. **You approve** — you see the request, check the money actually landed
   in your bank, and click Approve. Only then are credits added (1 credit
   = ₹1). You can also Reject with a reason.

## Why it's safe without a payment gateway

The app never trusts a self-reported payment on its own. A submitted
request is just a request — the balance doesn't change until you approve.
This means nobody can get free credits by entering a fake reference
number.

I built in these protections and tested each one:
- Credits are added ONLY on your approval, through the same audited credit
  ledger the rest of the app uses
- Approving the same request twice can't double-credit (the second attempt
  is blocked)
- A recharge needs a real amount and reference number to submit
- Duplicate pending references are rejected

## What I verified before sending

- The approval flow adds exactly the right credits and records it in the
  ledger — tested with mocked data
- The double-approve guard holds the balance steady
- Submission validation (amount, reference, admin-can't-submit) all correct
- Clean frontend build, full backend syntax check

Note: I couldn't run a live database test in my environment (the sandbox
blocks Prisma's engine download), so I tested the logic by mocking the
database. It's solid, but do run through the test steps once after
migrating.

## IMPORTANT: this update needs a database migration

It adds two new tables, so setup includes a migration step. The
instructions file handles it.

## When you're ready for fully-automatic payments

This manual flow is the no-signup, no-fees option. When you have volume,
Razorpay integration (a later phase) would make credits update
automatically without you approving each one — it replaces this manual
step. Until then, this gives your clients self-service recharge today.

## How to set this up

1. Extract this zip somewhere fresh.
2. Open the folder in Antigravity as its own project.
3. Paste this into Antigravity's prompt box:

> Read the file ANTIGRAVITY-INSTRUCTIONS.md in the project root and follow
> every step in it exactly. Set up the backend and frontend completely, fix
> any errors yourself (but never upgrade any package past the exact version
> already pinned in package.json, and never create a prisma.config.ts file),
> start both servers, and give me the two localhost links when everything
> is running.

4. Set up your UPI details on the Recharge Approvals page, then test the
   full flow using the steps in ANTIGRAVITY-INSTRUCTIONS.md.
