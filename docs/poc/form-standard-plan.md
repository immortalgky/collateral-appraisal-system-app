# Form standard v2: two layouts, one system

Design source: canvas https://claude.ai/artifact/3aaBkf27dHTEtnEoCcZg4h (Standard / Compact / narrow / States boards).
Branch: `feature/block-condo-redesign` (continues the Block work; Block code moves onto the new shared parts).

## Goal

The app keeps exactly two form layouts, **Standard** and **Compact**, defined in `DESIGN.md` and built into the shared components. Every older variant, the skin CSS, and the per-feature copies (BlockTable, unitsLook, CondoSections, the local SectionRow copies) are removed rather than kept beside the new parts.

## Decisions already taken

| Topic | Decision |
|---|---|
| Input height | Standard 36px · Compact 32px · Compact table cell input ≥ 28px · line-height 1.5, text vertically centred (Thai stacked marks measured: no clipping at these sizes) |
| Section TOC | Wide screens: in the right rail under the photo card. Narrow: none |
| Photos | Wide (container ≥ 1180px): 300px sticky side card (cover, thumbs without the cover, "+" tile). Narrow: the gallery strip as the first section |
| Wide tables (e.g. 13-column depreciation) | Wide: horizontal scroll with frozen first + action columns. Narrow: automatic switch to 2-line cards |
| Table add action | Standard: small outline "+ เพิ่ม…" button under the table. Compact: link on the section band |
| Block pages | Standard only (ignore the user's layout setting) |
| Textarea | Always shows the counter |
| Where Compact applies | Property form screens only (all property routes, PMA, machinery summary, Data Correction editor). Every other form, Block included, is Standard |
| Cadence | User: run all phases through, report once at the end (2026-10-21) |

## Phases (each ends with gates + screenshots before the next)

- [x] **0. DESIGN.md.** Write the new "Form system" chapter: tokens for both layouts (controls, labels, sections, tables, chips, textarea, buttons, tabs, action bar, photo rail/strip, read-only/error/disabled states, narrow rules) and remove the rules it replaces (35.5px input, the TitleTable table reference, the focus deviations, button table).
- [x] **1. Layout mechanism.** One `FormLayoutProvider` / `useFormLayout()` context (`standard` | `compact`) set by the page shell from the user setting; Block shells force `standard`. Components choose their classes from it. `data-form-layout` + `.cas-form-grid` CSS gating is retired.
- [x] **2. Shared primitives** (parallel agents, non-overlapping files):
  - a. Inputs: Input/TextInput, NumberInput (suffix), Dropdown, TDropdown, Textarea (counter on), DatePickerInput, RadioGroup/CheckboxGroup chips, Toggle, Checkbox/Switch; one focus style.
  - b. FormFields: label above (Standard) / label-left 2 pairs per row (Compact), read-only + error states.
  - c. Sections: one `FormSheet` + `FormSection` replacing SectionHeader card use in forms, FormCard in forms, both SectionRow, the 6 local copies, CondoSection.
  - d. Tables: one editable table kit (head, row, totals, add action per layout, empty state, frozen columns, auto card mode) replacing denseTable, constructionGrid TH/TD, BlockTable/blockTable.css, unitsLook table classes.
  - e. Button sizes aligned with the system.
- [x] **3. Property editor shell.** Identity header + tabs, right rail (photo card + TOC) / narrow strip; shared photo aside (moved from Block `CondoPhotoAside`).
- [x] **4. Property forms.** All 11 property routes (land, building, condo, land-building, machinery + summary, 4 lease types, 2 PMA) and their tables (LandTitleTable, BoundaryFields, LandAreaDeductionTable, SurfaceTable, BuildingDetail, CondoAreaDetailForm, RentalInfoForm ×3, MachinerySummaryTab, construction editor).
- [x] **5. Block.** Move Block onto the shared parts; delete BlockTable, blockTable.css, unitsLook/look.tsx duplicates, CondoSections, CondoPhotoAside, block SectionRow.
- [x] **6. Remove the old system.** formLayout.css, formLayoutCompact.css, formLayoutStandard.css, formLayoutSkin.css (~5,100 lines), dead hooks, `cas-*` classes; Data Correction editor and market-comparable editor moved onto the new parts; tests updated.
- [x] **7. Other features.** Request, quotation, userManagement, pricing analysis and the rest pick up the Standard defaults through the primitives; spot-check each folder.
- [x] **8. QA.** tsc / eslint / full vitest; visual matrix: every property type × Standard/Compact × 1440/1024 × light/dark; Block pages; request pages; Thai glyph check.

## Rules

- Implementation and testing go through subagents; the main session coordinates and reviews.
- Every browser probe aborts non-GET requests.
- No commit until the user has tested.
- Real fields only; no new features beyond the design.

## Review

(2026-10-21, phases 0–8 done, nothing committed)

- **Form system:** DESIGN.md §17. Shared parts: FormLayoutProvider, FormSheet/FormSection, FormTable kit, FormShell, EditorHeader, PhotoAside, NativeSelect, restyled inputs and Button. The old skin CSS (~5,100 lines), `data-form-layout`, `cas-*` and the per-feature copies are deleted.
- **Dark mode:**
  - Slate layered palette: canvas `--app-canvas` #13161c, card #1c2129, recessed input #151a21, input edge #444a53.
  - The daisyUI dark theme block in `index.css` now carries base-* and primary/secondary/etc. The old `theme.css` values were overridden by daisyUI and never applied.
- **Codemod:**
  - ~665 files: raw white/gray/primary classes became palette tokens; tints got `dark:` pairs.
  - Dynamic colour classes became static maps.
  - Charts use token strokes.
  - Script: scratchpad `codemod/codemod.mjs`.
- **Gates:** tsc 0, eslint no new findings vs baseline, vitest 3038 passed / 2 skipped.
- **Visual QA:** 14 pages + extras, light and dark. All defects fixed and re-verified.
- **Open:**
  - The generated report PDF (white paper) has not been checked by hand.
  - The bell timestamp is 4.44:1.
  - The success badge is white on #22c55e at 2.28:1 (already like this before).
  - The `TitleDeedSheet` error tint was kept on purpose (paper).
  - Light hints (`text-gray-400`) are now ink-2, darker.
