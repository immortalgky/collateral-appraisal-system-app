# Form mocks v2: fixes from the Impeccable critique

Critiques (2026-10-23): live pages 27/40, mocks 25/40. Snapshots are in `.impeccable/critique/`.

Mocks:
- the form canvas, https://claude.ai/artifact/3aaBkf27dHTEtnEoCcZg4h (scratchpad `property-form-design/project/`, 17 boards)
- the Block mock, `docs/poc/block-project-redesign-mock.html` (https://claude.ai/artifact/EJWhCKsWMT8M5N9vzctFr5)

Both are backed up as `*.bak-2026-10-23` in the session scratchpad.

## Decisions (user, 2026-10-23)

The user chose all four fix groups:
1. one colour set with contrast fixes
2. the two heavy tables
3. the missing-fields chip with save states
4. a land-building board

Further decisions:
- **Control edge:** 3:1.
- **Unit-price assumptions panel:** collapses to a strip, and the result columns are frozen.

## One token set

The token set comes from `src/styles/theme.css` (palette) plus these changes:

| Token | Light | Dark |
|---|---|---|
| canvas / card / input bg | theme.css | #13161c / #1c2129 / #151a21 |
| control edge (inputs, selects, unselected chips, outline buttons) | **#858c97** (3.39:1 on white, 3.16 on canvas) | **#6b7380** (3.65 on input bg, 3.38 on card) |
| control edge hover | #6b7380 | #8a919d |
| card / section hairline | theme.css `--palette-line` (stays light) | #383d44 |
| focus, every control (inputs, chips, toggles, buttons, tabs) | border #0f766e + 3px ring rgba(15,118,110,.25) | border #14b8a6 + ring rgba(20,184,166,.30) |
| primary fill (buttons, selected chip, active page) | #0f766e, white text 5.47:1 | #0f766e |
| disabled button | grey fill (theme.css surface-3, ink-3 text), no opacity | same rule |
| muted text (stub tabs, counters, "—") | ≥4.5:1 (ink-2) | ≥4.5:1 |

Standard and Compact use the same colours and differ only in geometry (§17.2).

## Plan

- [x] 1a. Canvas: apply the token set to all 17 boards (CSS only, no layout changes).
- [x] 1b. Block mock:
  - apply the token set
  - remove the Compact toggle (Block is Standard only)
  - collapsible assumptions strip, auto-collapsed below 1600px; "ขยายตาราง" hides the panel
  - result columns frozen on the right, plus an edge fade
  - widen the select
  - add the missing-fields chip to the bar
  - after a recalculation, show a summary of units changed and the total delta
  - read-only renders disabled controls (§17.3)
- [x] 2a. Tables (StandardBuilding, StandardNarrowBuilding, CompactBuilding):
  - switch to cards when the table is wider than its container
  - freeze the total and actions columns
  - widen the select columns
  - fix the tfoot padding
- [x] 2b. Missing-fields chip in the bar of Main, Compact, BlockModel and the narrow and dark boards. The States and StatesDark boards add the chip, the popover grouped by section, a failed save, saving, and complete.
- [x] 2c. New board: Compact land-building (real fields from the land-building form configs); `canvas.json` is updated.
- [x] 3. QA:
  - render every board at its width, light and dark
  - measure contrast (edge ≥3:1, text ≥4.5:1)
  - check for clipping
- [x] 4. Publish both artifacts to their existing URLs (canvas v16, Block v22). The user reviews, then the code work is planned.

## Out of scope

- English chip labels from parameter data. The TH description holds English text, so this is fixed in the admin parameter UI, not in the mock or the code.
- The Block 9-tab regrouping, and dropping Standard on property forms (open questions from the critique).

## Review (2026-10-23, mocks only, no app code)

- **Canvas (17+1 boards):**
  - **Tokens:** one token block per board. Control edge 3.39:1 light and 3.38:1 dark, one focus style on every control at 5.47:1, and all text at 4.5:1 or more. The dark boards use the §17.13 slate palette. Board heights are unchanged by the recolour.
  - **Tables:** StandardBuilding at 1440 with the rail switches to cards because the table is wider than its container. Option A in StandardNarrowBuilding has frozen columns and is kept for comparison only. CompactBuilding fits at 1440, and its tfoot padding is now 8px.
  - **Missing-fields chip:** on all 14 boards, with counts that match the required fields drawn empty. States and StatesDark gain the chip, popover, failed-save, saving and saved (toast) states.
  - **New board:** CompactLandBuilding draws 106 of the 133 config fields. The 27 left out are conditional "other" and remark fields.
  - **Copy:** the toggles read ไม่ใช่/ใช่.
  - **Layout:** `canvas.json` rows were re-laid with the measured heights.
- **Block mock:**
  - the same token set
  - the Compact toggle is removed (this also fixes "ยูนิตที่ขาย" showing no value)
  - the assumptions panel collapses to a 56px strip, auto-collapsed below 1600px; "ขยายตาราง" also folds it
  - มูลค่าประเมิน and ราคาบังคับขาย are frozen on the right
  - the chip and failed save are in the bar
  - after a recalculation, a summary shows units changed and the deltas
  - the consequence text sits by the button
  - read-only renders disabled controls
  - English mock copy is now Thai
- **Open for the user:**
  - In 4 of 8 price-tab states, one numeric column is half under the frozen edge before any scroll.
  - Freeze มูลค่าปัดเศษ instead of มูลค่าประเมิน?
  - Chip and outline-button hover is now a grey edge, where it used to be teal.
  - Dark primary fill vs card is 2.95:1 (its label is 5.47:1).
  - At 1024, the expanded panel stacks above the table.
  - CompactLandBuilding:
    - distance gets its own row, so latitude and longitude stay paired
    - the shared keys `propertyName`, `hasObligation`, `obligationDetails` and `remark` show on both tabs
- **Then:** carry the token changes into `theme.css`/§17, and the table and price-panel rules into code (plan once the user approves).
