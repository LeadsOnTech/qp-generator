# Setup Instructions (for the Antigravity agent) — Manual UPI (Scan-and-Pay) Recharge with Admin Approval

Built on the user's project. All prior features preserved (auth, credits,
trial logins, bulk remove, math typesetting, solutions, bank analytics).

## What this adds

A self-service credit recharge flow using a UPI QR code, with NO payment
gateway — safe because credits only move when the admin approves:

1. **Admin sets up UPI details** (new "Recharge Approvals" page): uploads a
   UPI QR image and/or enters a UPI ID + payee name. Stored in a new
   AppSetting key/value table.

2. **Institute recharges** (new "Recharge Credits" page in their sidebar):
   sees the QR + UPI ID, pays via any UPI app, then submits the amount and
   the UPI reference/UTR number. This creates a PENDING request — it does
   NOT add credits yet.

3. **Admin approves/rejects** (Recharge Approvals page): sees all pending
   requests with the institute name, amount, reference, and current
   balance. Approving adds the credits via the SAME ledger-backed
   adjustCredits used everywhere else (1 credit = ₹1). Rejecting adds
   nothing and can include a reason shown to the institute.

Safety properties (all tested directly with mocked data):
   - Credits are only added on admin approval — a self-reported payment
     alone never changes a balance.
   - Approving an already-approved request is blocked (no double credit).
   - Submitting requires a positive amount and a reference number; admin
     accounts can't submit institute recharge requests; a duplicate
     pending reference is rejected.

## IMPORTANT — a migration IS needed here

This adds two new tables (RechargeRequest, AppSetting) and a relation, so
a Prisma migration is required:

    npx prisma migrate dev --name manual_recharge

Accept the prompt. If it reports no changes, that's fine — proceed.

All package versions remain EXACT-pinned. Do NOT run `npm update`. Do NOT
upgrade Prisma past 6.15.0 or add a prisma.config.ts file. Do NOT delete
backend/assets/fonts/.

## Setup steps

1. Stop any servers from a previous session (ports 4000/5173).
2. In `backend/`: run `npm install`, then `npx prisma generate`.
3. In `backend/`: run `npx prisma migrate dev --name manual_recharge`
   (accept the prompt; "no changes" is fine).
4. Start the backend with `npm run dev` (port 4000).
5. In `frontend/`: run `npm install`.
6. Start the frontend with `npm run dev` (port 5173).
7. Confirm both running with zero errors, give the user both links.

## What to tell the user to test

1. Log in as Admin → "Recharge Approvals" (new sidebar item) → in "Your
   UPI payment details", enter a UPI ID and/or upload a QR image, save
2. Log in as an institute (or a trial account) → "Recharge Credits" (new
   sidebar item) → confirm the QR / UPI ID shows
3. As the institute, enter an amount and any reference number → submit →
   confirm it appears under "Your recharge requests" as Pending, and the
   balance has NOT changed yet
4. Back as Admin → "Recharge Approvals" → the request appears under
   Pending → click Approve → confirm the message shows credits added
5. Confirm the institute's balance increased by exactly the amount, and
   the request now shows Approved for them
6. Test Reject on another request → confirm no credits added and the
   institute sees it as Rejected
7. Try approving the same request twice (e.g. double-click) → the second
   attempt should be safely blocked with an "already approved" message
