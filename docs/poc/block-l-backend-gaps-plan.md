# Block L: close the backend gaps

**Source:** the Review of `block-lb-land-redesign-plan.md` (2026-10-21), which lists the BE gaps for L that were not fixed.
- **BE:** worktree `collateral-appraisal-system-api/pearlfish`, branch `feature/block-condo-redesign` (uncommitted).
- **FE:** this repo, same branch.
- **Commits:** none until the user has tested.

**Root cause (investigated 2026-10-25):** every branch tests `== ProjectType.Condo`, so L silently takes the LB path, which assumes models. `ProjectType.HasStructures()` (U and LB) is the right switch, but only two callers use it today.

## Plan (one `dotnet-backend` agent, BE files only)

1. **AddModel guard.**
   - Add `RequireStructures(op)` next to `RequireCondo` in `Project.cs`. `AddModel` and `UpdateModel` throw `InvalidProjectStateException` for L.
   - The auto-created models (`AutoCreateLandAndBuildingModels`, `LinkUnitsToTowersAndModels`) are skipped for L.
   - The bank-master seed (`AppraisalCreationService.cs:1151`) does not carry `ModelType` into L.
   - Rewrite the 2 `ProjectTypeTests` that expect `AddModel` on L to succeed.
2. **Unit upload for L** (`ProjectUnitExcelParser`).
   - A land parser requires Plot Number, Land Area and Selling Price. House Number is optional (decision 1).
   - It does not read Model, Floors or Usable Area.
   - One `Parse(stream, projectType)` dispatch, used by the 3 callers (upload, reappraisal upload, reappraisal preview).
3. **Price import for L.**
   - A `Land` layout in `UnitPriceImportLayout` with no fire-insurance column and compare columns เนื้อที่ดิน and ราคาขาย.
   - `CoverageHeader` becomes nullable, and the parser and template skip it when it is null.
4. **Re-match for L.** `BlockReappraisalMatcher` and `ProjectUnit.UpdateAttributesFrom` compare and write only `sellingPrice` and `landArea` when `!HasStructures()`. A small matcher test is added.
5. **Regulatory export.** DopaCode becomes `IN ('U','LB','L')` in **both** `vw_RegulatoryExport.sql` and `sp_RegulatoryExport.sql`. The export runs the procedure.
   - The user applies this with `migrate`.
6. **Unit price for L, AdjustPricePercentage.**
   - The base is the land value, `landArea × LandIncreaseDecreaseRate`, when `!HasStructures()`. The FE already labels that rate "ราคาที่ดินมาตรฐาน (บาท/ตร.ว.)" for L (decision 2).
   - Rounding stays as LB.
7. **Pricing assumptions first load.** `GetProjectPricingAssumptionsQueryHandler` returns the shell DTO for L even without models, instead of null.
8. **Gates (test-automator):**
   - `dotnet build`, reading the full output (the summary hides errors).
   - Appraisal and Collateral unit tests.
   - Integration tests for the price import, if SQL is reachable.
9. **QA:** an API probe on the L fixture (appraisalId `01A15F0C-2B20-7C49-A676-090464B16C81`; writes are allowed only there):
   - upload L units
   - import prices
   - `AddModel` returns 400
   - recalculate

## FE leftovers (one `frontend-developer` agent, FE files only)

- **`FieldHelp.tsx:146`:** remove `focus-visible:ring-primary-500/40` so the global teal `:focus-visible` applies.
- **`DESIGN.md`:** run `prettier --write`.
- **KPI flash:** after "บันทึกและคำนวณราคาใหม่", the KPI tiles whose value changed get a short highlight, about 1.2 s, on the accent wash. With `prefers-reduced-motion` there is no animation.
- **L assumptions:** if step 7 changes the shape the FE gets, check it still loads.

## Decisions (user, 2026-10-25)

1. **L unit file:** Plot Number, Land Area and Selling Price are required. House Number is optional. No per-unit title-deed field, so no migration.
2. **L land price base:** land area × `LandIncreaseDecreaseRate` ("ราคาที่ดินมาตรฐาน (บาท/ตร.ว.)"). No new field.
3. **QA:** the live API on :7111 is the user's and cannot be restarted. The live probe waits until the user restarts it with this branch. Until then, verification is the unit and integration tests.

## Out of scope

- `LandAreaSqWa` in the regulatory export for block projects. It is NULL for every block, not only L.
- The data-fix script `20261020120000_DataFix_RemoveTowerModelImagesOfDeletedGalleryPhotos.sql`. It is already written; the user runs `migrate`.

## Review (2026-10-25, done, nothing committed)

**BE (pearlfish), steps 1–7 done:**
- **Models:** for L, `AddModel` and `UpdateModel` return 400, and nothing creates models automatically, whether upload, re-match or the bank-master seed. The seed also nulls `NumberOfFloors` and `UsableArea` for L.
- **Unit upload:** L has its own parser. Plot, land area and selling price are required; house number is optional.
- **Price import:** a Land layout with no fire column. The preview reports `projectType` "Land".
- **Re-match:** it compares only selling price and land area.
- **Regulatory export:** the DopaCode allow-list includes 'L' in the view and the stored procedure, one line each. **The user runs `migrate`.**
- **AdjustPricePercentage:** for L the base is `landArea × LandIncreaseDecreaseRate`; LB is unchanged.
- **Pricing assumptions:** L gets a shell DTO (`id` is Guid.Empty) instead of null.

**FE:**
- `FieldHelp` uses the global teal focus.
- `DESIGN.md` is prettier-formatted, and its glob paths are wrapped in backticks.
- **KPI flash:** a tile whose value changed during a calculate mutation flashes for 1.2 s on the accent wash; there is no animation under reduced motion.
- **Import dialog:** for Land there is no coverage tile.
- **Change-type dialog:** `BlockProjectPage` no longer counts the empty-id shell as existing pricing, so it doesn't warn for nothing.
- `SectionHeader` calls its hook unconditionally (an ESLint fix).

**Gates:**
- FE: tsc 0; vitest 3,239 passed; ESLint shows no new findings after the fix; prettier passes.
- BE: build has 0 errors; Appraisal.Tests 1,014 and Collateral.Tests 149 pass; the new xUnit1051 warning is fixed.
- Integration tests were not run, because they need SQL.

**Not verified:** a live API probe on the L fixture. It needs the user's :7111 to run this branch.

**Open:**
- **Old L data:** existing L projects with auto-created models or assumptions get no data fix.
- **KPI flash:** it doesn't fire on Excel import or on a flag save.

## Code review round (2026-10-25, nothing committed)

**BE (`/code-review`, 9 findings, 6 fixed):**
- **L unit price:** `CalculateLandAndBuildingUnitPrices` ignores models for L, so old L projects with auto-created models price as land only. No data fix needed.
- **Totals before calculate:** `GetUnitPriceSource` returns null totals when no unit is priced (EF `Sum` gave 0).
- **Gallery photo removal:** `IProjectRepository.GetByGalleryPhotoAsync` returns `Project` roots, and `Project.RemoveImagesOfPhoto` unlinks the photo from towers and models.
- **New cover after removal:** chosen by `DisplaySequence` then `Id`, as the data-fix SQL does.
- **Unit parser:** L uses the LB parser with `landOnly`.
- **Regulatory SQL:** a stale comment is fixed in the view and the stored procedure.

**BE, not fixed:**
- The FE already handles the `"Land"` preview type.
- `UpdateAttributesFrom` leaves the old model fields on L units, which are harmless now.
- **Open, for the user:** gallery photo removal still leaves dangling rows in MarketComparableImages and AppendixDocuments. This dates from before this branch.

**FE (code-reviewer, 1 finding, fixed):**
- **Defect:** on a read-only Block page, Project Information showed "—" for district and province.
- **Fix:** `ProjectInfoTab` `reset()` fills the names from the sub-district code, as the property and Request mappers do. A test is added.

**Gates:**
- **BE:** build has 0 errors; Appraisal.Tests 1,016 and Collateral.Tests 149 pass.
- **FE:** tsc clean; blockProject vitest 231 pass; prettier and eslint pass on the changed files.

## `/code-review` loop (2026-10-25, following the review-loop rule)

**Round 1:** `high --max-findings all` on the whole branch. BE had 12 findings, FE had 12.

**Snapshots for round 2+**, so a later round reviews only the fix diff:
- `git stash create`: BE `5f101416`, FE `3e7584d0`.
- Run `git diff <sha>` against them, plus any new untracked files.

### Settled decisions (do not re-raise)
- **L in general:**
  - L has no models.
  - The L unit file requires plot, land area and selling price; house number is optional.
  - The L percentage base is landArea × LandIncreaseDecreaseRate.
  - The L price ignores leftover models.
  - The preview type "Land" is handled by the FE.
  - `UpdateAttributesFrom` leaves old model fields on L units.
  - DopaCode keeps its explicit `IN` list.
- **L code structure:** the `HasStructures()` branches stay at each site, and L uses the LB parser through `landOnly`. Round 1 suggested going back to a separate parser or a descriptor, the opposite of the earlier review.
- **`RemoveImagesOfPhoto`:** the small copy in ProjectTower and ProjectModel stays. Two entities with different image types don't justify a shared helper.
- **`GetByGalleryPhotoAsync`:** it loads towers, models and their images, not units. This follows from the aggregate-root rule, and photo deletes are rare.
- **Data fix:** an image whose GalleryPhotoId has no gallery row is dangling by definition, so the script deletes it. The add handler accepting a missing photo id is a pre-existing gap and needs a separate ticket.
- **`GetProjectPricingAssumptionsQueryHandler`:** loading through the write-side repository is pre-existing and needs a separate ticket.
- **MarketComparableImages / AppendixDocuments:** rows left behind on photo removal are pre-existing and need a separate ticket.
- **`.claude/settings.json`:** this untracked file in the BE worktree is never committed.
- **Form v3:** every decision in `form-v3-code-plan.md` stands:
  - the read page
  - the ActionBar hidden on read pages
  - the TOC status
  - `pick()` spans
  - the 11-column building table and its cards
  - Block = Standard only
  - the KPI flash on calculate only
  - the Land dialog without the coverage tile
  - ProjectInfoTab filling the location names in `reset()`

### Rounds
**BE:** the loop stopped after round 4, because no new defect was accepted.
- **r1:** 12 findings, 5 fixed.
- **r2:** 5 findings, 5 fixed. Land Area and Selling Price must be > 0. The pricing-assumption guard gets a test.
- **r3:** no correctness defects.
  - Keyless rows are skipped again, as LB does, so a totals row doesn't reject the file. This is a lead decision; the trade-off is that a row missing both plot and house is dropped without an error.
  - Row errors name the failing field.
- **r4:** 5 findings, all declined:
  - **Labelled totals rows** ('Total' in plot or 'รวม' in house): LB has the same behaviour, so it isn't new.
  - **E-notation:** LB parses numbers the same way.
  - **Redundant LB header aliases:** a nit, and LB is out of scope.

**FE:**
- **r1:** 12 findings, 12 fixed.
- **r2:** 7 findings, 6 fixed:
  - the % unit
  - the `dataUpdatedAt` check
  - the % option keyed on the saved value
  - shared partial-date helpers
  - parseISO with a fallback
- **r3:** 7 findings, 4 fixed:
  - the timestamp is taken right before calculate
  - `partialDateText` is built back up as a plain string from the control's own helpers; the Intl version could crash
  - the fallback applies to strings only
- **r4:** 5 low findings, so the loop stopped.
  - **Small fixes made:** invalid parts and the parts below them are dropped, a comment is corrected, and the error-branch test is added back.
  - **Declined:** parseISO vs DatePicker `new Date` (it flip-flopped between rounds), an unproven focus-refetch race, the clock step, formatter cost.
- **Final gates:** tsc clean; full vitest 3,249 pass; prettier and eslint clean.
- **Snapshot for FE r3:** `fe-snap-r2/` in the scratchpad: the tracked SHA `f695d1c9` plus a copy of the untracked files.

### Settled (added during the loop)
- The import write warning is restored.
- AdjustPricePercentage appears in the dropdown only when it is already saved.
- The global zod token error map stays; raw renders go through `ValidationText`.
