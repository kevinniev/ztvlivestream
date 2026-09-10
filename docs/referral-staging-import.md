# Referral Program Candidate: Managed Staging Import Guide

This guide applies to the GitHub-only referral-system candidate. It is **not** an authorization to import, activate, publish, send invitations, issue links, calculate rewards, or make payments.

## Candidate Scope

The candidate adds a fail-closed referral program with three new tables and two interface routes:

| Component | Route or table | Current behavior |
|---|---|---|
| Admin Referral Desk | `/admin/referrals` | Restricted to authenticated administrators; presents provisional-only program state. |
| Private partner URL | `/partner/:token` | Shows a locked public information page; does not collect client data. |
| Partners | `referral_partners` | New records default to `provisional`, `not_started`, and `inactive`. |
| Attribution | `referral_attributions` | Holds referrals until every qualification condition passes. |
| Reward review | `referral_reward_reviews` | Permits only manual, non-payment decisions. |

## Mandatory Preflight Before Any Managed-Staging Import

1. **Legal approval:** Obtain written approval for referral terms, eligibility, compensation, disclosures, privacy/consent wording, tax treatment, content rights, and termination rules.
2. **Environment isolation:** Confirm the target is the private ZTVLIVE Recovery Staging workspace, not `ztvlivestream.com`; set no custom domain and do not connect a production database.
3. **Credentials:** Keep OAuth, Stripe, outbound email, SMS, analytics, storage, social publishing, and production secrets absent. The referral candidate has no corresponding secret requirement.
4. **Schema review:** Review `drizzle/0014_equal_slipstream.sql`. It creates only the three referral tables and their indexes/foreign keys. Do not apply it to production.
5. **Mode lock:** Leave `REFERRAL_PROGRAM_MODE` unset or set only to `staging_locked`. The application defaults to locked when the value is absent or malformed.
6. **Owner sign-off:** Obtain a separate written approval naming the exact staging project/version, database target, branch/commit, and testing date.

## Post-Import Staging Checks

| Check | Expected result |
|---|---|
| Anonymous `/partner/:token` | Locked page; no personal-data field, tracking action, or reward promise. |
| Non-admin `/admin/referrals` | Restricted page; no queue visibility or mutation access. |
| Admin `/admin/referrals` | Program lock visible; no activated partner or reward action. |
| `referrals.programStatus` | `staging_locked`, `not_sent`, `inactive`, and `disabled`. |
| `referrals.captureAttribution` | `held` / `program_locked` with `persisted: false`. |
| Local test suite | Referral policy tests pass before and after import. |

## Explicitly Prohibited Until Separate Approvals

- Connecting or migrating any production database.
- Binding `ztvlivestream.com`, publishing a version, or making the referral pages discoverable publicly.
- Adding an email, SMS, CRM, affiliate, payment, analytics, social, or tracking integration.
- Enabling `staging_demo` or creating actual partner invitations.
- Activating private links or receiving client/creator submissions.
- Approving or paying any reward, credit, commission, or other compensation.

> This candidate is designed so an absent or incorrect configuration fails closed. A future activation requires separate legal, owner, security, and staging approvals.
