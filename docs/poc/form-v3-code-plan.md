# Form v3: implement the approved mock in code

**Sources:**
- The mock canvas v20 at https://claude.ai/artifact/3aaBkf27dHTEtnEoCcZg4h, approved by the user on 2026-10-25 ("โอเครตาม mock").
- `docs/poc/form-mock-v3-plan.md`.
- DESIGN.md §17.3 (read page).

**Branch:** `feature/block-condo-redesign`, uncommitted. No commit until the user has tested.

## What the code has today (investigated 2026-10-25)

**Read-only:**
- `FormProvider` reads `usePageReadOnly()` into `FormReadOnlyContext`.
- A page is read-only when:
  - the appraisal is in a terminal status,
  - the menu node is missing, or `canEdit` is false (this is how a checker or verifier step becomes read-only),
  - it is opened under `/appraisals/:id`, or
  - it is `request/:requestId`.
- Every control renders disabled, and unselected chips and toggle options stay visible.

**TOC and missing fields:**
- `SectionToc` (shared) lists `{id, title}`. It knows nothing about missing fields.
- `useFormMissingFields` already groups the missing items by `FormSection` DOM id (`summary.sections[].id`).
- `useJumpToMissing` already scrolls to a field.

**Field order:**
- Field order lives in the form files (`LandDetailForm.tsx`, also used for land-building, and `CondoDetailForm.tsx`) through `pick(...)`, which can also override spans.

**Addresses:**
- The address groups have a hand-placed `FormSubheading`: "ที่อยู่ตามเอกสารสิทธิ์" and "ที่อยู่ตามทะเบียนราษฎร์ (DOPA)".

**Compact mini-labels:**
- Code has **no** pair with several inputs and inline mini-labels; the address triple and the road fields are separate pairs.
- So the v3 mini-label clip was a mock-only bug (a CSS class collision) and there is nothing to fix in code.

**Building table:**
- The depreciation table is `features/appraisal/components/tables/BuildingDetail.tsx`: 13 columns, `MIN_WIDTH` 107 / 79.7 rem.
- `useTableCards` already switches to cards only when the holder is narrower than `MIN_WIDTH`.

## Workstreams (agents own separate files)

### A. Read page and TOC status
**Owns:**
- `src/shared/components/form/*`, except `table/`
- `src/shared/components/sections/SectionToc.tsx`
- `features/appraisal/components/FormShellBody.tsx`
- `common.json` in th, en and zh

**A1. Read page** (DESIGN.md §17.3 "Read page"):
- **Where:** in a page in read-only mode, `FormFields`/`FormFieldShell` render label and value, not disabled controls.
- **Standard:** label over value on a fixed 4-column track. Spans map to 3, 6 or 12 by size, so values line up down the page.
- **Compact:** label-left text rows of about 33 px.
- **Values:**
  - **Text:** shown as typed.
  - **Number:** formatted, right-aligned, with its unit.
  - **Date:** formatted as `dd/MM/yyyy` (BE).
  - **Dropdown, parameter search, location:** the option or name label, not the code.
  - **Chips and toggles:** only the selected labels, joined " · ".
  - **Empty:** "—".
  - **Empty and required:** "— ขาด" in `--palette-warn`.
- **Not drawn:**
  - the required mark
  - in-field buttons (map picker, auto-fill)
  - the textarea counter
- **Unchanged:**
  - Tables keep their existing read-only rows.
  - Read-only already hides the ActionBar and the chip.

**A2. TOC status:**
- **TOC rows:** `SectionToc` takes an optional status per section from `useMissingFields()`.
  - A complete section shows ✓ in green, with `aria-label` "ครบ".
  - A section with missing fields shows "ขาด n" as an amber pill.
  - Clicking a section with missing fields goes to its first missing field (`useJumpToMissing`), not the section top.
- **Without the rail (narrow shell):** `FormSection` shows the same status in its header hint slot. `FormShellBody` tells the sections whether the rail is shown, through a context.
- **Read page:** the status stays, since it is what the reviewer needs.

### B. Field configs and labels
**Owns:**
- `features/appraisal/configs/fields.ts`
- `features/appraisal/forms/LandDetailForm.tsx`
- `features/appraisal/forms/CondoDetailForm.tsx`
- the other property form files touched by B4
- `appraisal.json` in th, en and zh

**B1. Address sub-headings merged into the labels:**
- **Change:** remove the two `FormSubheading`s per form and relabel the fields.
  - Title-deed address: "ตำบล/แขวง · ตามเอกสารสิทธิ์", and the same for อำเภอ/เขต and จังหวัด.
  - DOPA address: "… · ตามทะเบียนราษฎร์ (DOPA)".
- **Forms:** land, land-building (it uses the land form) and condo.
- **Locales:** en and zh get matching labels.
- **Missing-fields popover:** its labels become unique, so it no longer needs the sub-heading.

**B2. Three reorders** (`LandDetailForm`, which also changes land-building). Order is shared, so Standard changes too.
- สำนักงานที่ดิน moves after ลองจิจูด.
- การจัดสรร moves before การใช้ประโยชน์ที่ดิน.
- การคมนาคม moves before สิทธิทางเข้า-ออก.

**B3. Condo spans:**
- **Condo name:** ชื่ออาคารชุด goes from 12 to 6, beside ทะเบียนอาคารชุดเลขที่.
- **Limitations:** the ข้อจำกัด toggles and พระราชกฤษฎีกา share one row. Their remark textareas stay full rows.

**B4. The rest of the span repack:**
- The agent diffs the mock boards (scratchpad `property-form-design/project/{Main,StandardLand,StandardBuilding,Compact,CompactBuilding,CompactLandBuilding}.dc.html`, field `data-f` and span classes) against the configs.
- It applies each span difference and lists them in its report. Labels and fields do not change.

### C. Building table, option ข
**Owns:**
- `features/appraisal/components/tables/BuildingDetail.tsx` and its test
- `pricingAnalysis.json` keys, only if a new label is needed

**Changes:**
- The table goes from 13 columns to 11. Two computed pairs are stacked in one right-aligned cell, with the small 12 px line on top and the bold value below:
  - ค่าเสื่อมราคา: "รวม%" over "ราคารวม"
  - มูลค่าหลังหักค่าเสื่อม: "บาท/ตร.ม." over "ราคารวม"
- The order and group heads stay the same.
- **Card view:** it keeps all the values as they are today.
- **Width:** column widths follow the `BuildingTable` board, and `MIN_WIDTH` becomes about 75 rem in both layouts (≤ 1,050 px at 14 px).
- **Block model:** this table also renders there (`showCostSummary` false), so the agent checks it.

### Gates and QA
- **Gates (test-automator):**
  - `tsc -b --force`
  - eslint against the baseline
  - the full vitest suite (localeParity runs only in the full suite)
  - prettier on the changed files
- **QA (ui-visual-validator) on :3101, every non-GET aborted:**
  - **Pages:** condo, land, land-building and building property pages, in Standard and Compact, light and dark, at 1440 and 1024.
  - **Read page:** a read-only appraisal under `/appraisals/:id`.
  - **TOC:** the TOC status, and the jump to the first missing field.
  - **Building table:** it is a table at 1440 with the rail and cards at 1024.
  - **Measured:** clipping and contrast.

## Decisions (user, 2026-10-25)

1. **Read page scope:** every read-only page that uses `FormFields`, including Request (`request/:requestId`) and the Block pages. QA covers those pages too.
2. **B2's reorders:** they apply to both layouts.
3. **B4 scope (lead decision, 2026-10-25):** agent B found the code forms were never repacked. Most fields are still col-span-12, so applying only the v3 deltas would leave lone narrow fields.
   - **Rule:** B4 applies the current mock spans to every field the Standard boards draw. Compact follows from those spans.
   - **Fields not on the boards:** they keep their spans. The exception is a field that would end up alone on a row; it is widened to fill the row.
   - **B3:** follows the mock pairs: propertyName | condoName and buildingNumber | condoRegistrationNumber.

## Out of scope
- Chip groups to dropdowns.
- New keyboard behaviour.
- Compact multi-input pairs, which the code does not have.

## Review (2026-10-25, done, nothing committed)

**Read page (A):**
- **How it renders:** `FormReadValue` plus `FormFieldShell read`. Standard uses a 4-column track: a textarea takes 12 and every other field takes 3. Compact pairs two to a row.
- **Values:** a choice group shows only its selected values, a checkbox or switch shows yes/no, an empty value is "—", and an empty required value is "—" plus the amber "ขาด" pill.
- **ActionBar:** it is hidden on read pages. The opt-out `keepWhenReadOnly` is used only by `CreateMarketComparablePage`, which has a Duplicate button.
- **Hand-built fields:** Block tower and model, the Request group-title `*`, the condo insurance pair (B) and the building cost summary (C) were converted.
- **Request page:** it is read-only, so it changes too; its notes now show as text.

**TOC status (A):**
- `SectionToc` shows ✓ or "ขาด n", and the "ขาด n" jumps to the first missing field.
- On the narrow shell, the status sits in the section header. The photo section opts out.
- On land-building, each tab carries its own "ขาด n" pill. The red "1" that was already on the tab is a separate count: fields that failed validation.

**Rows and spans:**
- `rowGroups` lets a run that contains a toggle or chip group drop its quarter spans below the breakpoint.
- In Compact, a choice group with 4 options or fewer takes a half pair.

**Configs and labels (B):**
- Address labels carry "· ตามเอกสารสิทธิ์" or "· ตามทะเบียนราษฎร์ (DOPA)", and the sub-headings are gone.
- Reorders: the three planned ones, plus `isRentedOut` and `isAppraisable` moved next to the owner, the land physical row (fill, percent, shape), and the land zoning row.
- Spans follow the Standard boards for condo, land, land-building and building. Spans are `pick()` overrides; `fields.ts` is untouched.

**Building table (C):**
- 11 columns with stacked computed cells.
- `MIN_WIDTH` is 71.29 rem in Standard and 70.86 rem in Compact.
- Cards show all the values. FormTable gained a column option, `show: 'table' | 'card'`.
- On read pages the cost summary shows as plain values.

**Gates:**
- tsc: 0 errors.
- vitest: 274 files, 3,235 passed.
- ESLint: no new findings.
- Prettier: the only offender is `FormStringToggle.tsx`, which already failed at HEAD.
- The 93 unmocked `localhost:3000` requests in 5 test files are the same at HEAD.

**QA:** passed in 2 rounds, GET-only.

**Open:**
- **D6:** at 1440, with the Application Details panel open or the rail shown, the Standard holder is 841–926 px, so it shows cards. This is waiting for the user to decide.
- **D4:** in Compact, some half fields sit alone next to long choice groups (more than 4 options).
- **Toggle overflow:** at 1024 with the panel open, the toggle overflows its cell by 11 px but does not overlap the next field.
- **Condo:** `documentValidationResultType` sits alone in the ownership section.
- **Incident:** `EditorTabBar.test.tsx` was overwritten and then restored. The transcripts show that its only earlier change was the same import line, so nothing was lost.

## Follow-ups from user testing (2026-10-25)

**Done:**
- **Input edge:** back to the original soft `#e0e7e9`.
- **Grey text and icons:** back to the original greys via the `--palette-gray-300..600` tokens.
- **Primary text and wash:** back to `#0d9488` and `bg-primary/10`. Dark mode is unchanged.
- **Building card:** the result strip is 4 cells, with "ค่าเสื่อมราคา (รวม n%)" in the second. A new kit option, `card.rowLabel`, carries the per-row percent.
- **Unit-price table:** no right-pinned columns, and the tail columns are back in HEAD's order.
- **Block KPI tiles:** they no longer squeeze and overlap; a tile that doesn't fit moves to a second row.
- **Ownership section:** the user tried two other layouts and kept the current one (verified | owner | rented out).

**In progress:**
- **Clear control:** "× ล้าง (n)" becomes an inline text button after the chips, in the shared multi-select chip group.
- **ผังเมือง** (`urbanPlanningType`): a dropdown changing to single-select chips at 12 columns, on the land and condo forms. The market comparable page keeps its dropdown.

**Parked by the user:**
- **Solid green fills:** the selected chip, buttons, toggles, checkboxes and pagination stay on primary-700 (`#0f766e`) instead of `#0d9488`.

**Open:**
- **Left-pinned columns:** whether to unpin ลำดับที่ and เลขแปลง/เลขห้อง in the unit-price table.
- **Condo KPI strip:** it wraps to 2 rows with the panel open.
