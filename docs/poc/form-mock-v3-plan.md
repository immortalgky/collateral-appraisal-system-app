# Form mocks v3: refine the existing canvas

Source: the user, 2026-10-25. The user stopped the Impeccable concept roll and asked to improve the existing mock
instead ("ลองดู mock ตัวเดิมแล้วปรับปรุงจากตรงนั้นดีกว่า").

- Canvas: scratchpad `property-form-design/project/`, https://claude.ai/artifact/3aaBkf27dHTEtnEoCcZg4h (v16).
- Pains (PRODUCT.md): entry is slow, review is hard, the forms look dense, and they are long.

Fixed constraints:
- the field set and labels
- Standard and Compact both stay
- the v2 token set (3:1 control edge, one teal focus)
- chips stay chips: turning long chip groups into dropdowns was not chosen

## Chosen (user, 2026-10-25)

1. Shorten the forms.
2. The TOC shows each section's status.
3. A read page for reviewers.

The Compact mini-label clipping is a defect, so it is fixed as well.

## Plan

- [x] 0. Back up `project/` as `project.bak-2026-10-25/`. Record the current board heights as the "before" numbers.
- [x] 1. **Shorten**, on Main, StandardLand, StandardBuilding, Compact, CompactLandBuilding and CompactBuilding:
  - **Choice groups:** a group that fits half a row sits beside another field instead of taking a full row. That means a toggle, or 4 or fewer short options. In Standard it takes span 6; in Compact it is one pair.
  - **Text fields:** spans follow the content (names 6, numbers and codes 3–4), so short fields no longer stretch the full row.
  - **Sub-headings:** in Standard, a sub-heading followed by a single row merges into that row's labels.
  - **Target:** each board 20–30% shorter, with every field still there (field counts are checked before and after).
- [x] 2. **TOC status:**
  - **Status per section:** each TOC row ends with a green ✓ or an amber "ขาด n". The numbers add up to the bar's "ขาด n ช่อง".
  - **Click:** clicking a row goes to that section's first missing field.
  - **Without the rail (narrow boards):** the same status sits in the section header's hint slot.
- [x] 3. **Read page for reviewers.** Two new boards, StandardRead and CompactRead, using the same condo data as Main.
  - **Layout:** label/value rows. Standard shows label over value in the 12-column grid; Compact uses label-left pairs.
  - **Choice groups:** only the selected values, as plain text. Empty values show "—". Missing required values show "— ขาด" in amber.
  - **Numbers and tables:** numbers keep their units and stay right-aligned. Tables become read tables.
  - **Chrome:** the TOC with status stays; there is no action bar.
  - This replaces §17.3 "read-only renders every control as disabled" for whole-page read-only mode. DESIGN.md changes only after approval.
- [x] 4. **Compact mini-labels:**
  - **Labels:** don't wrap (`whitespace-nowrap shrink-0`), and the input takes the rest of the cell.
  - **Where:** the ตำบล/อำเภอ/จังหวัด and distance/width/lanes rows on every Compact board.
- [x] 5. **Mirror:** carry 1–4 into the dark boards and the narrow boards. Re-lay `canvas.json`.
- [x] 6. **QA:**
  - render every board at its width in light and dark
  - compare heights before and after
  - field-count parity
  - no clipping (Thai marks)
  - contrast (≥4.5:1 text, ≥3:1 edges)
- [x] 7. **Publish:** publish to the same canvas URL (v17), then the user reviews. No app code until the user approves.

## Out of scope

- Chip groups to dropdowns.
- New keyboard behaviour.
- Moving fields between tabs.
- English parameter descriptions (admin data).

## Review (2026-10-25, mocks only, no app code)

The canvas is published as version 18 at the same URL. Its boards are mirrored onto the dark and narrow boards, and there are 20 boards in total.

- **Shorten (missed target):** the user accepted keeping the spacing spec. The edit forms were already packed; what is left is long chip groups, textareas and tables.
  - Standard: Main −4.9%, Land −9.4%, Building −3.7%
  - Compact: −1.1%, Building +0.1%, LandBuilding −8.3%
  - Address sub-headings were merged into the labels ("ตำบล/แขวง · ตามเอกสารสิทธิ์").
  - Three in-section reorders.
- **TOC status:** each section shows ✓ or "ขาด n", and the counts sum to the bar chip. The link goes to the missing field. Narrow boards show the status in the section header or band.
  - StandardLand's deed row "ข้อมูลไม่ครบ" now counts as 1.
  - StandardBuilding gained the "ครบถ้วน" chip.
- **Read page:** StandardRead is 2171 px (Main is 4003, −46%). CompactRead is 1788 px (Compact is 2541, −30%).
  - **Layout:** a fixed 4-column track in Standard, label-left in Compact.
  - **Values:** choice groups show selected values only. Missing values read "— ขาด".
  - **Removed:** the required marks and the edit-only buttons.
- **Compact mini-labels:** a `.mi` class collision with the missing-chip CSS clipped them. They are now `.mlab` / `.munit` on all Compact boards.
- **QA (independent):** all 6 checks pass: parity, status sums, clipping, contrast (minimum 4.58), overlap, and canvas heights. Its 2 warnings are fixed: the link targets and the narrow status style.
- **Decided (user, 2026-10-25):**
  - The read page is approved as drawn: no required marks, units added. DESIGN.md §17.3 now has the read-page rule.
  - The building detail is a table; it turns into cards only when the table would have to scroll.
- **Building table options** (new board `BuildingTable`, canvas v19), all drawn at the real 1,053 px holder at 1440 with the rail. Today the table is 1,116 px in Compact and 1,498 px in Standard, so both show cards at 1440.
  - **ก:** 13 columns, narrowed. 1,028 px; Compact only.
  - **ข (recommended):** 11 columns; the two computed pairs are stacked in one cell. About 1,010 px in Compact and 1,050 px in Standard. It fits both layouts at 1440, and the section is 310 px against 689 px for the cards.
  - **ค:** two lines per item. About 870 px, so it fits down to 1024, but it is the tallest of the three.
  - **Chosen: ข** (user, 2026-10-25). Canvas v20 applies it to three boards:
    - CompactLandBuilding: the cards become the table, 5,859 → 5,435 px.
    - CompactBuilding: the 13-column table becomes ข, 2,132 → 2,170 px, because of the two-line header.
    - StandardBuilding: the cards become the table, 3,585 → 3,210 px.
  - **Narrow boards:** at 1024 without the rail, StandardNarrowBuilding stays cards (942 px is less than about 1,050 px), and its note now says so.
  - **No clipping:** a measurement of every select, input and number cell found nothing clipped.
  - **For the code:** `BuildingDetail.tsx` drops to 11 columns, with the two computed pairs stacked, and `MIN_WIDTH` becomes about 75rem in both layouts. `useTableCards` already switches to cards only when the table would scroll.
