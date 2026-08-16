# ZTVLIVE Daily Quiz Prize Rules — Counsel Review Handoff

> This document is a product-policy draft prepared for legal review. It is **not legal advice** and must be approved by qualified counsel before public prize promotion, winner notification, or prize fulfillment.

## Proposed public rule summary

| Topic | Current product copy |
|---|---|
| Eligibility | Verified ZTVLIVE account holders, age 18 or older, and lawful United States residents except where prohibited. |
| Purchase | No purchase is necessary to enter or win, and a purchase does not improve odds of winning. |
| Entry limit | One prize-eligible, authenticated entry per person per Arizona MST day. Unlimited replays are labeled **“practice — not prize eligible.”** |
| Daily cutoff | **11:59 PM Arizona MST**. |
| Ranking | Highest server-validated score, then shortest server-measured completion time, then earliest verified completion time. |
| Verification | Potential winners are reviewed for account identity, eligibility, one-entry compliance, and any fraud or abuse signal. |
| Notification | Verified potential winners are contacted within 48 hours after the Arizona MST cutoff. |
| Publication | No winner is shown publicly until an administrator has verified the entry. |

## Counsel decisions required before launch

1. Confirm the permitted jurisdictions, excluded jurisdictions, age threshold, sponsor/operator identity, and any registration, bond, filing, or disclosure obligations.
2. Approve the full official rules, privacy treatment for verification data, winner-list availability, tax reporting, affidavit/release requirements, and a winner response deadline.
3. Confirm the prize description, approximate retail value, fulfillment method, substitution policy, dispute process, and record-retention period.
4. Approve the fraud, duplicate-account, automation, eligibility-verification, disqualification, and appeal standards.

## Operations controls already implemented

The secure quiz stores answer keys and scoring on the server. It creates a unique ranked-attempt key per daily quiz and authenticated account, uses server timestamps for speed and cutoff checks, and exposes only masked reviewed winner names. An administrator must queue candidates, verify eligibility, then mark notification and award status in the protected operations page.

## Required launch approval

Counsel should return an approved rules version and effective date. Update `rulesVersion` in the daily-quiz configuration and replace the in-product “Draft rules require legal approval” text only after written approval is received.
