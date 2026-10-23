# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

All four groups below are primary users of the same app; each sees the data scoped to its own role
and organisation.

- **Bank staff (requestors):** credit / relationship staff who raise appraisal requests for loan
  collateral, supply documents, and follow the request's status.
- **Internal appraisers:** the bank's own appraisers, who inspect the property, record collateral
  details, and run the pricing analysis.
- **External appraisal companies:** firms that win work through quotations or round-robin assignment
  and use the same screens, limited to their own cases.
- **Approvers, committee and admins:** review and approve appraisal results and fees, and maintain
  the configuration (workflows, SLAs, fee structures, templates, users, master data).

## Product Purpose

The Collateral Appraisal System runs the bank's collateral appraisal end to end: request, document
collection, assignment (internal or external, quotation or round robin), appraisal and pricing
analysis, committee approval, fees and invoicing, and report generation. Success means two things
equally: the workflow moves fast and stays within SLA with a traceable history, and the appraised
value is correct and defensible against the bank's valuation criteria.

## Operating Context

- Desktop office use, typically 1440–1920px screens. Mobile is not a target.
- Users work through long multi-section forms (title deeds, land, buildings, condos, vehicles,
  machinery), document checklists and uploads, list pages with search and filters, and task queues.
- Requests are identified by request no., appraisal no. and LOS (loan origination system) no.;
  properties by title deed, land parcel, room, licence plate or project name.
- Work is driven by a configurable workflow with assignments, SLAs, follow-ups and notifications.

## Capabilities and Constraints

- Feature areas (`src/features/`): request, appraisal, pricingAnalysis, quotation, committee,
  meeting, document-followup, task, taskMonitor, reappraisal, block projects, invoice,
  reportGeneration, dashboard, and admin/maintenance areas (workflow, SLA, fees, templates, users,
  master data, menus, webhooks, jobs).
- Three UI languages (Thai, English, Chinese) with identical key sets; **Thai is the primary
  language** of users. Thai stacked vowels and tone marks must never be clipped.
- Role- and organisation-scoped data: internal and external users share screens, and what each sees
  is decided by permission, not by separate UIs.
- Stack and technical rules are recorded in `CLAUDE.md` and `DESIGN.md`.

## Brand Commitments

None confirmed. No mandated bank logo, name treatment or corporate identity has been given; do not
invent one.

## Evidence on Hand

No testimonials, metrics, customer names or benchmark figures are on hand. Do not fabricate them.

## Product Principles

1. **Speed and correctness are equal.** A shortcut that risks a wrong value is not a win, and a
   correct screen that slows the workflow is not finished.
2. **Every step is traceable.** Status, who acted, and when must be visible and auditable.
3. **One app, many roles.** Shared screens, data scoped per caller; never a parallel UI per role.
4. **Thai first.** Copy, layout and line height are designed for Thai, then checked in English and
   Chinese.
5. **Desktop work tool.** Optimise for long sessions at office screens, not for mobile or marketing.
