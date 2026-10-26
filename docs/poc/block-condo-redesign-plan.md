# Block Condo redesign: implementation plan

Mock: `docs/poc/block-project-redesign-mock.html` (artifact v13, https://claude.ai/artifact/EJWhCKsWMT8M5N9vzctFr5)

## Scope

- **In:** Condo (`projectType="U"`, routes `block-condo`, `block-condo/model/:id`, `block-condo/tower/:id`). FE only, unless phase 1 finds that the header KPIs or the unit-price bug need the backend.
- **Out:** LB and L (next round), moving fields between project/tower/model (user: "ฟิลด์ไว้ทีหลัง"), BE schema changes.
- **Two looks, following `data-form-layout`** (`useUIStore(s => s.formLayout)`):
  - `classic` (มาตรฐาน): the mock's card look. KPI summary card, icon-pill tab bar, each form is ONE card with sections divided by rules, label above the control.
  - `grid` (กระชับ): the property editor shell. `EditorIdentityCard` band, `EditorTabBar`, `.cas-form-grid` compact sheet, skin tables.
- **Field configs:** unchanged (`blockProject/configs/fields.ts` + the reused appraisal configs). Spans and order stay as they are.

## Phases (each phase ends with gates + screenshots before the next starts)

- [ ] **0. Workspace.** Create an orca FE worktree from fresh `origin/main` (branch `feature/block-condo-redesign`). Run it on :3101 against the user's :7111, using the CORS/login recipe from this session.
- [ ] **1. Investigate (read-only agent).**
  1. Header KPIs: can units/sold, models pending, priced X/Y, total appraisal value and total force-sale value all come from queries the page already runs (`useGetProjectUnits`, `useGetProjectModels`, `useGetProjectTowers`, unit-price query)? Or is a small `GET /project/summary` cheaper?
  2. Unit-price bug root cause (69003149.): the calculated view shows 0.00 "ตัวอย่าง (ยังไม่บันทึก)" while saved prices exist, "มีการแก้ไขที่ยังไม่บันทึก" shows on load, and the source toggle switches with no confirm. Is the shown source the stored `UnitPriceSource`?
  3. Which pieces LB shares (`UnitListingTab`, `UnitPriceTab`, `ModelListingTab`, `ModelDetailPage`), so the condo changes stay gated or are made shared on purpose.
- [ ] **2. Shell.**
  - Layout hook.
  - `BlockProjectHeader`: KPI card (classic) or identity band (grid), with no cover tile (projects take no photos).
  - Tab bar in both looks.
  - Mismatch chip.
- [ ] **3. Project info tab (U).** Classic one-card sections, or the grid sheet. Derived-vs-entered hints with "ใช้ค่านี้", per Q3.
- [ ] **4. Towers.**
  - `TowerListingTab` becomes a table: entered vs counted units, sold, models, priced, floors.
  - `TowerDetailPage` gets a classic header card, or the grid identity band + tab strip + sheet.
  - Prev/next between towers.
- [ ] **5. Models.**
  - `ModelListingTab` becomes a table grouped by tower, with the grid view dropped per Q1.
  - `ModelDetailPage` gets the same shell as towers.
  - One pricing action in the detail header, per Q2.
- [ ] **6. Unit listing.** Status/tower filter chips, model and floor filters, sticky header, totals row for the filtered set. Warning before an Excel upload replaces all units.
- [ ] **7. Unit price.**
  - Source state card with an in-page confirm, per Q4.
  - Assumptions side panel.
  - Results table with sticky header and first columns, flags as chips.
  - Saved prices shown, not a zero preview.
  - Phase 1 bug fixes.
  - Q5 label fixes and Q6 "—".
- [ ] **8. QA.**
  - `test-automator`: `tsc -b --force`, eslint, vitest for blockProject and appraisal.
  - `ui-visual-validator`: :3101 probe in both looks, edit and read-only, with every non-GET aborted.
  - Measure against the mock. Report with screenshots.

## Decisions (2026-10-19: user accepted every default; run phases 0–8 without stopping)

Worktree: `~/orca/workspaces/collateral-appraisal-system-app/block-condo-redesign` (branch `feature/block-condo-redesign`, from origin/main 46d59876).

| # | Question | Default |
|---|---|---|
| Q1 | Drop the model grid-card view, table only? | Yes |
| Q2 | Pricing button only in the model detail header? | Yes, no new endpoint |
| Q3 | Duplicated numbers: show the derived value + "ใช้ค่านี้", don't lock? | Yes |
| Q4 | Price-source switch: immediate after in-page confirm, or on Save? | Immediate + confirm (as BE does today) |
| Q5 | Apply the "label แก้" unit fixes? | Yes (U-relevant ones only this round) |
| Q6 | Units of unpriced models: "—" and excluded from totals? | Yes |
| A | Shared tabs (units, unit price, model list): change for LB too, or gate to U? | Gate to U this round |
| B | Footer button language | Keep the app's current labels |
| C | Compact: widen `unitForSaleCount`/`numberOfPhase` from col-span-2? | Yes, to 4 (block config only) |

## Rules

- **Who does the work:** implementation goes to `react-expert` (FE) and, only if needed, `dotnet-backend`. Every round of gates goes to `test-automator`, and visual checks go to `ui-visual-validator`.
- **Commits:** none until the user has tested. Stop after each phase for review.
- **Browser probes:** every probe aborts non-GET requests. Writes are allowed only on our own test fixture.

## Review (2026-10-19, phases 0–8 done, nothing committed)

**FE** (`block-condo-redesign`): condo branch in BlockProjectPage / ModelDetailPage, tower pages rewritten, shared tabs gated by `isCondo`.
- **New primitives:** `components/condo/`, `condo/towersModels/`, `condo/unitsPrice/`.
- **Locale keys:** `condoShell`, `condoTowersModels`, `condoUnitsPrice`.
- **Unit-price bug fixed (condo):**
  - stored prices are shown until the user edits;
  - `differs` becomes a hint, not unsaved;
  - every source switch with priced units asks for an in-page confirm;
  - Q6 "—" applies to the recompute view only, and stored values always show.

**BE** (`pearlfish`, branch `feature/block-condo-redesign`):
- `GetUnitPriceSource` gains `TotalAppraisalValueRounded` / `TotalForceSellingPrice`, covered by unit + Testcontainers SQL tests.
- `ProjectUnitDto` gains `ProjectTowerId` / `ProjectModelId`.
- The 3 maintenance patch scripts set `UnitPriceSource='Imported'`.
- Not done: the bank seed `20260828090000_*` has the same gap and needs a new journaled script.

**Gates (round 4):**
- tsc 0, eslint 0, vitest 2924 passed / 2 skipped (blockProject 135).
- BE: unit tests 989, integration 5.
- 93 msw "socket hang up" traces come from the user's vite on :3000 and fail no test.

**Visual QA** (:3101 against the user's :7111 = collateral-scene-3d branch, so header money = "—" and units are counted by name):
- 8/8 checks pass.
- LB is pixel-identical to main within 0.05%.
- D1/D3/D6 fixed and re-verified; D2 is the form's general dirty tracking; D4 is the intended compact required-empty style; D5 was a hover artifact.

**Open:**
- Dark-mode `border-gray-100` on the shared `EditorIdentityCard` aside.
- Dev data fix for 69003149 (SQL given to the user). Without it, Save on that tab recomputes all 1,414 stored prices to 0.
- A full end-to-end run on our own BE needs the pearlfish API on :7111.
- Deviations from the mock: detail pages have no project tab strip (separate routes); the tower list has no "priced" column; money keeps 2 decimals.
