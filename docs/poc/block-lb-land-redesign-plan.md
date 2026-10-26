# Block LB + L: bring them onto the condo standard

Mock: `docs/poc/block-project-redesign-mock.html` (type toggle U / LB / L). Branch `feature/block-condo-redesign` (uncommitted, same branch).

## Today

- **Already on the new form system:** project info form, ที่ดินโครงการ (FormShell), model detail (CondoDetailShell), LB pricing assumption sheet.
- **Still old:**
  - page chrome: no header/KPI, old pill nav, plain scroller
  - unit listing (StatStrip + raw table)
  - model list (card grid + raw table)
  - unit price (three FormCards)
- **L is broken:**
  - The router has no L route. The menu and the change-type dialog send L to `block-village`, which loads the project with `expectedType='LB'`.
  - `useGetProject` returns `null` on the type mismatch, so the L project-info form opens empty and Save would send `LB`.
  - `ProjectInfoForm`'s "hide construction progress for L" can never fire.
- **What L means is ambiguous:**
  - BE `ProjectType.Land`: `HasStructures()` = U or LB only. PO 2026-09-09: "L holds no buildings".
  - The parameter seed labels L "ที่ดินและสิ่งปลูกสร้าง (อยู่ระหว่างก่อสร้าง)".
  - The mock maps L onto the LB data, so it shows the แบบ tab with building fields.

## Decisions (user, 2026-10-21)

- **L is appraised as land:** no แบบ, no building fields, per BE `HasStructures()`. The แบบ tab is hidden for L, and units are land plots. How L units are priced is to be confirmed against the BE before step 7.
- **LB unit price behaves like condo:**
  - stored prices are shown until an assumption is edited
  - a source switch needs a confirm
  - no "unsaved" on load
- **Parameter label for L is correct:** "ที่ดินและสิ่งปลูกสร้าง (อยู่ระหว่างก่อสร้าง)" (user, 2026-10-21). L is a project still under construction, appraised as land only, with no models (BE `HasStructures()`). The type badge shows the parameter description.

## Plan

1. **L loads correctly.** Pages read the stored project type instead of the route's. `block-village` serves LB and L, so no new route is needed. Add an FE `hasStructures(t)` that matches the BE.
2. **One shell for every type.**
   - `CondoProjectHeader` / `CondoFrame` / `useCondoRollup` become type-aware.
   - LB/L: no towers tile/tab. Add a เอกสารสิทธิ์ tile ("N แปลง · X ไร่", opens ที่ดินโครงการ). Type badge uses the Badge tones `lb` / `l`.
   - Tab counts per type.
   - The old LB nav is deleted.
   - (Files keep their `Condo*` names this round; a rename can come later.)
3. **Project info.** `CondoFrame as="form"` for every type, `data-field` on every type (needed by the missing-fields chip later), unit-for-sale hint for LB/L.
4. **Unit listing.** Use the condo parts (import row, filters as chips, table with sticky head and totals). LB columns: plot · house no · status · model · floors · land · area · price. Model chips; no tower chips, no floor filter.
5. **Model list.** Use the condo list table without tower grouping. LB columns: units · usable area · land area · start price · standard price **บาท/หลัง** (fixes today's "/ ตร.ม." label). "Waiting for price" filter. The grid/card view is dropped (Q1 from the condo round).
6. **Model detail.** Add the pricing button in the "ข้อมูลแบบ" section head (as condo) and the `house` breadcrumb icon.
7. **Unit price.**
   - LB moves onto `CondoPriceLayout` / `CondoPriceResults` / `CondoHeadControls`. Columns: land diff and land +/- added; no tower/floor columns; nearGarden flag.
   - The assumption panel gets the land group and no floor group. The raw location `<table>` goes.
8. **ที่ดินโครงการ.** Make it fit under the shared header. Title-deed summary (count, ไร่, ตร.ว.) in the section head, as the mock does.
9. **Tests + QA.**
   - Flip `BlockProjectPage.test.tsx:159`. Add L load/save, LB header/KPI, unit list, model list.
   - Gates. Browser QA of LB + L in light/dark at 1440/1024, non-GET aborted.

## Out of scope

- Moving fields between project / tower / model ("ฟิลด์ไว้ทีหลัง").
- The LB model schema vs rendered-field drift (floor-material fields validated but not rendered). Listed for later.

## Review

(2026-10-21, done, nothing committed)

- **L loads by stored type:**
  - `useGetProject` no longer blanks a type mismatch, and `block-village` serves LB and L.
  - The badge shows the ProjectType parameter label.
  - `hasStructures()` was added.
- **One shell for U, LB and L:** the header, KPI and tabs are type-aware.
  - LB and L get a เอกสารสิทธิ์ tile.
  - L has no แบบ tab or tile.
  - The old LB nav is deleted.
- **Unit listing:** condo parts with per-type column sets. LB has model chips.
- **Model list:** LB is a table with prices in บาท/หลัง.
- **Model detail:** pricing button and facts.
- **Unit price:** condo layout and behaviour for LB and L.
  - L uses a land-only column set.
  - L's land rate is labelled "ราคาที่ดินมาตรฐาน (บาท/ตร.ว.)".
- **Verification dialog:** for L, it reveals a hidden column when that column differs.
- **Test fixture:** L block 69105523 (int.staff1 task `01A15F0C-C8B5-7252-8B52-A2CBBDC8E77A`), created through the API.
- **Gates:** tsc 0, eslint shows no new findings, vitest 3177 passed and 2 skipped.
- **Browser QA:** passes for L, LB and the condo regression, in light and dark, at 1440 and 1024.
- **BE gaps for L, not fixed:**
  - Unit upload requires the 7 LB headers.
  - Price import requires the fire column.
  - `AddModel` has no L guard.
  - The re-match diff compares model, floors and usable area for L.
  - `vw_RegulatoryExport` DopaCode is NULL for L.
  - `AdjustPricePercentage` gives 0 for L.
