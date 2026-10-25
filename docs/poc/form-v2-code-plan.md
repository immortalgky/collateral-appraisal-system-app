# Form v2: implement the approved mock fixes in code

Source:
- the approved mocks (user, 2026-10-23, "ลงมือได้เลย"): canvas v16 https://claude.ai/artifact/3aaBkf27dHTEtnEoCcZg4h and Block mock v22 https://claude.ai/artifact/EJWhCKsWMT8M5N9vzctFr5
- `docs/poc/form-mock-v2-plan.md`
- the live-page critique (27/40)

Branch: `feature/block-condo-redesign` (uncommitted, same branch). No commit until the user has tested.

The review items from the mock round were not answered, so each one is built as drawn:
- มูลค่าประเมิน and ราคาบังคับขาย are frozen
- hover is the grey edge
- the 1024 panel stacks above the table

## Workstreams (agents own separate files)

- [x] **W1. Tokens and controls** (shared, app-wide):
  - **Edges:** the `--palette-input-edge` light value becomes #858c97 (hover #6b7380), dark #6b7380 (hover #8a919d).
  - **Focus:** one style everywhere. Text controls use border #0f766e plus a 25% ring (dark #14b8a6, 30%). The global `:focus-visible` outline turns teal, so chips, toggles, buttons and tabs match.
  - **Contrast:** dark toggle unselected text at 4.5:1 or more, and muted text at 4.5:1 or more.
  - **Toggles:** the unselected style is the same in Standard and Compact.
  - **Action bar:** the outline buttons are identical in both layouts.
  - **Selection:** `::selection` and caret use the palette.
  - **Docs:** DESIGN.md §17 values are updated.
- [x] **W2. Tables and grid:**
  - **Table cards:** `useTableCards` turns cards on whenever the table's container is narrower than its `minWidth`, not only in a narrow shell.
  - **Depreciation table:** the select columns are wide enough that values are not truncated. The tfoot cell padding is at least 8px.
  - **Standard grid:** the address 3-up (ตำบล/อำเภอ/จังหวัด) and the lat/lng pair stay on one row when the shell is under 1180px with the rail.
- [x] **W3. Block unit price:**
  - **Assumptions panel:** it collapses to a strip, starting collapsed below 1600px, and the choice is remembered. "ขยายตาราง" also folds it.
  - **Columns:** มูลค่าประเมิน and ราคาบังคับขาย are frozen on the right with an edge fade.
  - **Select:** the method select is full width.
  - **Recalculation:** the consequence text sits by "บันทึกและคำนวณราคาใหม่", and a dismissible summary shows units changed and the deltas.
  - **Chip contrast:** `text-primary` on `bg-primary/10` moves to accent-ink (CondoModelListing:51, CondoPriceResults:318/349).
- [x] **Gates (test-automator):** tsc -b --force, eslint vs baseline, full vitest.
- [x] **QA (ui-visual-validator):** on :3101 with every non-GET aborted:
  - property land-building in Compact and Standard
  - Block L/LB unit price
  - light and dark at 1440 and 1024
  - contrast and clipping measured

## Out of scope

- English parameter TH descriptions (admin data).
- Block tab regrouping.
- Read-only copy changes.

## Review (2026-10-23, done, nothing committed)

- **W1:**
  - **Edge:** the control edge is #858c97 in light (3.39:1) and #6b7380 in dark (3.38:1).
  - **Focus:** one teal style. The global `:focus-visible` is #0f766e / #14b8a6. Text controls and select triggers show a border plus a 3px ring with no extra outline. A Tab walk found no blue left.
  - **Ghost buttons:** Cancel and Save draft are borderless in both layouts, following the mock.
  - **Other:** `::selection` and the caret use the palette; `usePointerMode` uses the same teal.
- **W2:**
  - **Table cards:** `useTableCards` switches to cards whenever the container is narrower than the table's minWidth.
  - **Depreciation table:** its minWidth is set per layout (Standard 107rem, Compact 79.7rem, 1116px). At 1440 with the rail it is cards in both layouts, because the real Compact sheet is 1053px. Compact becomes a table at 1920.
  - **Other tables:** totals labels span the empty columns and do not wrap, card padding is even, and the age-band trigger is a control box.
  - **Grid:** a new `rowGroups.ts` keeps the address triple and the lat/lng pair on one row, in Standard and Compact (lat/lng only).
- **W3:**
  - **Assumptions panel:** a 56px strip, collapsed below 1600px, remembered under `blockProject.assumptionsPanel`. "ขยายตาราง" folds it, and an invalid save reveals it.
  - **Frozen columns:** มูลค่าประเมิน and ราคาบังคับขาย on the right, with fades shown only while scrolled.
  - **Other:** the select is full width; the consequence hint is an ellipsis line; a recalculation summary note replaces the toast. Read-only shows no recalculation hint. "—" is 5.9:1 and the chips use accent ink.
- **Gates:** tsc 0; eslint shows no new findings (878 against a 5007 baseline); vitest 270 files, 3207 passed and 2 skipped.
- **QA:** every check passes after 2 fix rounds, with no writes. Screenshots are in the scratchpad `form-v2-qa/`.
- **Open:**
  - Compact depreciation at 1440 is cards, not the table the mock drew, because the real sheet is narrower. It would only fit if values were clipped.
  - The KPI flash after a recalculation was not done.
  - `DESIGN.md` is prettier-flagged (markdown).
  - `FieldHelp.tsx:146` still uses `ring-primary-500/40`.
