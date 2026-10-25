---
version: 1
slug: "es-appraisal-pages-administrationpage-tsx-10eb57ba"
primary_target: "src/features/appraisal/pages/AdministrationPage.tsx"
related_targets: ["src/features/appraisal/components/QuotationSection.tsx","src/features/appraisal/components/AssignmentFeeCard.tsx"]
---

# Surface brief: Administration (assignment) page

Scope: `/tasks/:taskId/administration` and `/appraisals/:id/administration` main area, including QuotationSection internals. Right "Application Details" panel and app sidebar unchanged. Visitor mode: Operate.

Audience/job: internal admins (IntAdmin pool) assign an appraisal to internal staff, an external company or an off-system company, and set the fee before assigning. Mixed load: fast routine assignments plus cases that need a careful look (construction inspection with a previous company, facility > 50M, quotations).

Constraints: every current function and state (see inventory), DESIGN.md visual system unchanged, real fields only, own-figure-or-none rule, i18n en/th/zh. Fix while here: external+manual missing-company error invisible; remark limit message 500 vs 4000; hard-coded English Cancel/modal titles; quotation section vs lock picking different quotations.

## Direction contract

THESIS: One form column in task order beside a sticky assignment slip that states exactly what will be sent. Refuses the current card stack with a fee rail that breaks when the side panel is open.
OWN-WORLD: DESIGN.md as is: white 16px cards, teal #0D9488 actions, purple for external, amber warnings, Roboto/Sarabun 13/12/15 scale. Slip = one card split into labeled segments with tabular figures.
STORY: The admin reads the slip to know who gets the job, how much and what is still missing; the form on the left is where they change it.
FIRST VIEWPORT: Breadcrumb + lock notice; left: previous-company line, type segmented, assignee card, quotation card (when used), fee rows, remark; right: slip with type, assignee, follow-up, fee total (only place with before-VAT/VAT/total), checks, and the actions (no footer bar).
SIGNATURE: The slip's checks turn green as requirements are met, each unmet one links to its field ("ไปแก้"), and มอบหมาย explains why it is disabled. No "just changed" highlight (user 2026-10-24).
RISK: Slip duplicating the form; keep segments terse. Narrow containers: slip becomes a sticky bottom bar.
FORM: canon (category standard) chosen by the user on round 3 · quality bar: Linear, Stripe Dashboard, Shopify Admin (order page), Jira/Atlassian · seed: seed:1474c1f3957973f9
Approved sketch: .impeccable/mocks/decision/canon.html
