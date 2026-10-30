# DESIGN.md: Collateral Appraisal FE design standard

Read this before any UI change. Every value below is taken from the code; the file that owns it is named so
you can check it. If the code and this file disagree, the code is what renders. Fix one or the other, never
both silently. Pixel values are given **at the 14px root** (viewport below 1920px, density `normal`).

**Two kinds of content.** Every numbered section ends with a marker:

| Marker | Meaning                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔒     | Technical rule, from the platform or a real bug. Binding for every change and every tool; changing one needs the user's decision.                                                                      |
| 🎨     | The current design language. Refinement follows it. A redesign or exploration may propose something else: show it on a mock first; after the user approves, update this file and `theme.css` together. |
| 📋     | Reference lists, not rules.                                                                                                                                                                            |

Inside a 🎨 section, a bullet or sentence marked 🔒 is a technical constraint and is binding.
Tools: edit this file in place. Do not regenerate it or convert it to another format (for example Google
Stitch DESIGN.md), and keep the section numbers; code comments cite them.

Exception: **section 17 (Form system)** is the target spec the form components are being migrated to
(`docs/poc/form-standard-plan.md`). Where a form component still renders differently, the component is
wrong, not section 17. Sections 1, 5, 6, 8, 9, 10 and 15 point to it where it replaces an older rule.

## 1. Where the styling lives 🔒

| File                                        | Owns                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.css`                             | Root size (`--cas-root-step`, `--cas-density`, `--cas-leading`), fonts, daisyUI size overrides, `.truncate` override, global focus outline, `.icon`                                                                                                                                                                                                                                                      |
| `src/styles/theme.css`                      | Colour tokens, type scale, `text-table`, line height, `--palette-*` / `--dc-*`, the form-system size and radius tokens (17.2), dark overrides                                                                                                                                                                                                                                                            |
| `src/shared/components/densityConstants.ts` | Density factors                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/shared/components/form/context`        | `FormLayoutProvider` and `useFormLayout()` (`'standard' \| 'compact'`), next to `useFormReadOnly()`. The page shell sets it from the user's form-layout setting; Block shells force `'standard'`. **There is no global CSS gating for form layouts** (no `data-form-layout`, no `.cas-form-grid`, no skin files): every form component reads the context and picks its own Tailwind classes (section 17) |
| `src/shared/components/`                    | Button, Badge, Card, Input, `inputs/*`, `form/*` (`FormFields`, `FormSheet`, `FormSection`, the `FormTable` family), photo aside/strip, `sections/*`, Pagination, SlideOverPanel                                                                                                                                                                                                                         |

Stack: React 19, TypeScript, Vite, Tailwind v4.2 (CSS-first `@theme`), daisyUI 5, Headless UI, `clsx`.
There is **no tailwind-merge** (see section 12).

## 2. Root size: 1rem is not 16px 🔒

```
html { font-size: calc(var(--cas-root-step) * var(--cas-density)); }
--cas-root-step: 14px          below 1920px viewport
--cas-root-step: 15px          at >= 1920px (px media query on purpose)
--cas-density:   compact 0.92 | normal 1 | comfortable 1.12   (user setting, ThemeProvider)
```

- 1rem = 14px at 1440, 15px at 1920. Tailwind spacing is `--spacing: 0.25rem`, so `p-2` is 7px, not 8px.
- Everything (type, spacing, control heights, table min-widths) is rem, so the viewport step and density
  scale the whole UI together. **No px literals for type or control sizes.** Borders stay px.
- To get a 1920 value, multiply the 1440 value by 15/14 (text-sm 13 -> 13.9, text-xs 12 -> 12.9).
- Tailwind's docs assume a 16px root and a different scale. Do not copy their px numbers; use the table below.

## 3. Type scale (`theme.css`) 🎨

Since 2026-10-10 the scale sits one step under the Tailwind defaults, to match the mocks.

| Class                                                     | rem    | px @14 | px @15 |
| --------------------------------------------------------- | ------ | ------ | ------ |
| `text-xs`                                                 | 0.8571 | 12     | 12.9   |
| `text-table` (custom: table rows, half a step under body) | 0.8929 | 12.5   | 13.4   |
| `text-sm`                                                 | 0.9286 | 13     | 13.9   |
| `text-base`                                               | 1.0714 | 15     | 16.1   |
| `text-lg`                                                 | 1.1429 | 16     | 17.1   |
| `text-xl`                                                 | 1.2857 | 18     | 19.3   |
| `text-2xl`                                                | 1.5714 | 22     | 23.6   |
| `text-3xl`                                                | 2      | 28     | 30     |

`text-4xl` and up are unchanged. 🔒 Line height: `text-xs` to `text-2xl`, `text-table` and `html` all use
`--cas-leading` = **1.5** (`index.css`).

Fonts: `'Roboto Variable'` (Latin, digits) then `Sarabun` (Thai subset only), self-hosted. Weights 400/500/600/700.
No italic face is loaded.

## 4. Thai text and `truncate` 🔒

`index.css` overrides Tailwind's `truncate` inside `@layer utilities`:

```css
.truncate {
  overflow-x: clip;
  overflow-y: visible;
}
:where(.truncate) {
  min-width: 0;
  min-height: 0;
}
```

- Why the first rule: stock `truncate` is `overflow: hidden`, which clips both axes. Thai stacks vowels and
  tone marks above and below the line (ที่ ปิ่ ฟ้), and Sarabun's content area is about 1.6em, so at a 1.5
  line box every truncated Thai text lost its top marks. Only the x-axis needs clipping for the ellipsis,
  and `clip` (unlike `hidden`) leaves the other axis alone.
- Why the second rule: `overflow: hidden` used to make a flex/grid item's automatic minimum size 0;
  `clip` does not, so a truncated item would stop shrinking. `:where()` restores `min-width: 0` with zero
  specificity, so a `min-w-*` class on the same element still wins.
- So **use `truncate` (plus a `title` with the full text) freely on Thai text.**
- Any other `overflow: hidden` box still clips vertically. Do not put `leading-tight` / `leading-none` /
  `leading-[1.x]` on Thai text inside one. The remaining table-cell `overflow-hidden text-ellipsis` combos
  (8 files, e.g. `AppraisalResultsTable`, `constructionGrid.ts`) are deliberately left untouched.

## 5. Type roles 🎨

| Role                                                                                                                                             | Classes                                                                                                         | px @14   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------- |
| Body, input text, Button md                                                                                                                      | `text-sm`                                                                                                       | 13       |
| Field label (form fields: 17.4)                                                                                                                  | `block text-xs font-medium text-(--palette-ink)` (+ `mb-1`) above the control; Compact puts it in a left column | 12 / 500 |
| Required mark                                                                                                                                    | `<span className="text-(--palette-req) ml-0.5">*</span>` (was `text-danger`, which fails 4.5:1)                 | -        |
| Caption, helper, error, secondary line                                                                                                           | `text-xs` (`text-gray-500`; error `text-danger-600`, in dark `--palette-danger`)                                | 12       |
| Table header `th`                                                                                                                                | `text-xs font-semibold text-gray-600`                                                                           | 12 / 600 |
| Table rows: list/catalog pages and TitleTable                                                                                                    | `text-table` on `<table>`                                                                                       | 12.5     |
| Table rows: modal and in-card tables                                                                                                             | `text-sm` on `<table>`                                                                                          | 13       |
| Table secondary line                                                                                                                             | `text-xs text-gray-400`/`text-gray-500`                                                                         | 12       |
| Status badge                                                                                                                                     | `<Badge size="sm">` (default)                                                                                   | 12       |
| Card heading, every page (Card, DocumentCardHeader, FormCard and SectionHeader `variant="card"` outside forms, `FormSection` title inside forms) | `text-base font-semibold text-gray-800` (`headingClassName` default; `FormSection` has no override)             | 15 / 600 |
| Page header (SectionHeader default with icon, list page `h3`)                                                                                    | `text-base font-semibold`                                                                                       | 15       |
| In-card sub-section (SectionHeader default, no icon)                                                                                             | `text-sm font-semibold text-gray-800` + `hr`                                                                    | 13 / 600 |
| Table group heading inside a card (TitleTable)                                                                                                   | `text-sm font-semibold text-gray-600`, count `text-xs`                                                          | 13 / 12  |
| Title drawer title                                                                                                                               | `text-base font-semibold`                                                                                       | 15       |
| Drawer body section heading                                                                                                                      | `text-sm font-semibold text-gray-800`, `border-b border-gray-100 pb-1.5`                                        | 13       |
| SlideOverPanel title / subtitle                                                                                                                  | `text-lg font-semibold` / `text-sm text-gray-500`                                                               | 16 / 13  |
| Toggle option, choice chip                                                                                                                       | `text-sm` medium (17.5); `text-xs` only for `sm` outside forms                                                  | 13       |
| Toolbar text action (expand/collapse/show preview)                                                                                               | `text-xs text-gray-600 hover:text-gray-900`, icon `size-3`                                                      | 12       |
| Filter chip                                                                                                                                      | `rounded-full border px-3 py-1 text-sm`, count `text-xs tabular-nums`                                           | 13 / 12  |
| File chip name, banner text                                                                                                                      | `text-xs`                                                                                                       | 12       |

Hierarchy rule: card heading (15 semibold) > in-card section (13 semibold) > body (13 regular), each one step
apart in size or weight. No ad-hoc sizes outside the scale; the user rejects tiny custom sizes. The only
allowed sub-scale size is the label inside the file-type tile (`FileBadgeIcon` sm, `text-[0.7143rem]` = 10px).
`headingClassName` stays on FormCard / SectionHeader / DocumentCardHeader (outside forms) for a page that
truly needs another size; no page passes it today. Inside a form, the section title is always `FormSection`'s
15/600 and the in-section sub-heading is 13/600 (17.6).

## 6. Colour tokens (`theme.css`) 🎨

| Token (Tailwind name)                             | Value                                                                                               | Use                                                                                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primary` / `primary-600`                         | `#0D9488` (teal)                                                                                    | Active underline, tints, icons. **Not** a fill behind white text: white on `#0D9488` is 3.7:1. Filled buttons and selected chips use `primary-700` (`#0F766E`, 5.5:1), hover `primary-800` (17.11) |
| `primary-50 … 900`                                | `#F0FDFA` `#CCFBF1` `#99F6E4` `#5EEAD4` `#2DD4BF` `#14B8A6` `#0D9488` `#0F766E` `#115E59` `#134E4A` | Tints, hover, flash                                                                                                                                                                                |
| `secondary` (+50…900)                             | `#475569` (slate)                                                                                   | Secondary button                                                                                                                                                                                   |
| `accent`                                          | `#D97706`                                                                                           | Rare highlight                                                                                                                                                                                     |
| `success` (+50, 100, 500, 600)                    | `#22C55E` (`#F0FDF4` `#DCFCE7` `#22C55E` `#16A34A`)                                                 | Success button/toast                                                                                                                                                                               |
| `warning`                                         | `#F59E0B`, content `#422006`; no shades                                                             | Warning; for tints use Tailwind `amber-*`                                                                                                                                                          |
| `info`                                            | `#3b82f6`                                                                                           | Info                                                                                                                                                                                               |
| `danger` = `error` (+50, 100, 300, 500, 600, 900) | `#EF4444` (`#fef2f2` `#fee2e2` `#fca5a5` `#EF4444` `#dc2626` `#7f1d1d`)                             | Delete, errors (text `danger-600`; the required `*` uses `--palette-req`)                                                                                                                          |
| `neutral`                                         | `#1f2937`                                                                                           | daisyUI neutral                                                                                                                                                                                    |
| `base-100` / `200` / `300`                        | `oklch(100% 0 0)` / `oklch(98% 0 0)` / `oklch(95% 0 0)`                                             | daisyUI surfaces                                                                                                                                                                                   |
| `base-content`                                    | `#1f2937`                                                                                           | daisyUI text                                                                                                                                                                                       |

- Greys are Tailwind v4's default `gray-*` (OKLCH, not the v3 hex). Text: 800 headings, 700 labels/body
  emphasis, 600 table heads and chips, 500 helper, 400 muted and idle icons. Lines: `gray-100` card and row
  rules, `gray-200` list containers and table heads on list pages; `gray-300` outline button. **Inside forms
  (section 17) neutrals come from `--palette-*`, not `gray-*`**, so dark mode needs no `dark:` variants.
- **Grey and green text outside the form standard (user decision 2026-10-25).** Icons and secondary text keep
  the original light greys through `--palette-gray-300 / 400 / 500 / 600` (light = Tailwind `gray-300…600`; dark
  collapses 400 to 600 onto `--palette-ink-2` and 300 onto `--palette-ink-3`). Green text and the soft highlight
  use `--palette-primary-text` (light = `primary`, dark = `--palette-accent-ink`) and `--palette-primary-wash`
  (light = `primary` at 10%, dark = `--palette-accent-wash`). Use these where the page used `text-gray-300…600`,
  `text-primary` or `bg-primary/10`. `--palette-ink-2` / `--palette-ink-3` stay the form-standard tokens
  (section 17) and `--palette-accent-ink` the form accent; do not reach for them for a plain grey icon or caption.
- `--palette-*` (surface, line, ink, input-edge, accent, warn, req…) and `--dc-*` in `theme.css` serve the
  form system (section 17) and the Appraisal Data Correction screen. Every one has a dark value.
- 🔒 Dark mode is `[data-theme=dark]` (`@custom-variant dark`), not the OS preference.
- 🔒 Global `:focus-visible` is a 2px `--focus-edge` outline, offset 2px (teal `#0F766E` light, `#14B8A6` dark; theme.css).
  It is the one focus style for buttons, chips, toggle options, tabs, links and icon buttons. Text controls (input,
  textarea, select, dropdown trigger, date) suppress it and draw the single field ring of 17.3 instead: border
  `--focus-edge` plus a 3px `--focus-ring` (`rgba(15,118,110,.25)` light, `rgba(20,184,166,.30)` dark), the same hue.
  `::selection` is `--palette-accent-line` and the text caret `--focus-edge`.

## 7. Status colours and banners 🎨

| State               | Dot            | Badge                                          | Row                   |
| ------------------- | -------------- | ---------------------------------------------- | --------------------- |
| Complete / has file | `bg-green-600` | `tone="green"` (`bg-green-50 text-green-700`)  | default               |
| Required, missing   | `bg-amber-500` | `tone="yellow"` (`bg-amber-50 text-amber-700`) | amber tint + left bar |
| Optional, empty     | `bg-gray-300`  | `tone="gray"`                                  | default               |

Incomplete title row (TitleTable): `bg-[color-mix(in_oklab,var(--color-amber-50)_70%,white)] hover:bg-amber-50`
plus `shadow-[inset_3px_0_0_#f59e0b]` on the first cell. 🔒 The tint is opaque on purpose (section 10).
Dots are `size-2 rounded-full` with a `title` naming the state.

**Pending-items banner** (pattern: `document-followup/components/OpenFollowupBanner.tsx`). Use it for any
"N items still waiting" notice:

- One slim line, collapsed by default: `role="status" flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg
border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-gray-700`. Count in `font-semibold text-amber-700`,
  then the reason (and who/when when there is only one), then a toggle `font-medium text-primary hover:underline`
  with `aria-expanded` ("ดูรายการ" / "ซ่อน").
- Expanded: `border-t border-amber-200 pt-1.5`, one compact `text-xs` grid row per item (name `truncate`,
  notes `line-clamp-2`, status badge, action link).
- `compact` variant (Decision screen) is read-only: same line and list, no cancel links for anyone.

## 8. Cards and surfaces 🎨

| Component                                                                            | Classes                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FormCard` (outside property/Block forms only; inside forms use `FormSection`, 17.6) | `bg-white rounded-2xl shadow-sm border border-gray-100`; body `p-5` (`noPadding` to drop); `coloredBorder` adds `border-l-4`                                                               |
| `SectionHeader variant="card"` (outside forms only)                                  | `px-5 py-4 border-b border-gray-100`; icon tile `w-9 h-9 rounded-xl shadow-sm` + colour pair (`bg-primary/10 text-primary`, `bg-blue-50 text-blue-500`…); subtitle `text-xs text-gray-500` |
| `Card`                                                                               | `bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden`; header `px-6 py-4`; body `p-6`; footer `bg-gray-50`                                                                |
| List-page table box                                                                  | `bg-white rounded-lg border border-gray-200 overflow-hidden`                                                                                                                               |
| Row menu / popover                                                                   | `rounded-lg border border-gray-200 bg-white py-1 shadow-lg`, items `px-3 py-2 text-sm text-gray-700 data-focus:bg-gray-100`                                                                |

- 🔒 New page/section headers outside forms use `SectionHeader` / `FormCard`; inside a `FormSheet` they are
  `FormSection` (17.6). Do not build a custom header row (and do not write another local `SectionRow`); save
  space by putting actions in `rightIcon` / the section's `actions` slot, not by restyling the title.
- Admin / monitoring list pages (Application Log, Failed Messages, Webhook deliveries and subscriptions, Job
  schedules) use a plain header instead: `h2 text-base font-semibold text-gray-900` over
  `p text-xs text-gray-500 mt-0.5`, no icon tile and no page padding of their own (user decision 2026-10-25).
- **Compact card header** for data-dense panes (a results card with a table and a row of controls):
  `FormCard size="sm"` / `SectionHeader variant="card" size="sm"` gives `px-4 py-2.5` instead of
  `px-5 py-4`, about 46px with a 30px button in it (default `md` is about 62px). The default is
  unchanged; use `sm` only where vertical space is the point (the Block unit-price tab).
- **A card that fills a height**: `FormCard bodyClassName="flex min-h-0 flex-1 flex-col"` (with a
  `max-h-*` and `flex flex-col` on the card itself) makes the body a flex column, so a scrolling table
  inside it (`min-h-0 flex-1 overflow-auto`) takes the height left under the header. Do not style the
  body with `[&>div:last-child]` selectors.
- A card whose table runs to its bottom edge drops the bottom radius, top stays round:
  `FormCard className="rounded-b-none!"` with `noPadding` (`TitleInformationForm.tsx`), or a plain
  `section` with `rounded-t-2xl rounded-b-none`. Remove the last table's own bottom border so the card edge is
  the only line (`[&>section:last-of-type>div:last-child]:border-b-0`).

## 9. Controls 🎨

**Button** (`shared/components/Button.tsx`): `inline-flex items-center justify-center rounded-ctl font-medium`,
`type="button"` by default, disabled = grey fill (17.10), focus = the global `:focus-visible` outline (the old
`ring-2 ring-primary/40 ring-offset-2` is removed). Heights are explicit (`h-*`), not derived from `py`, so a
Thai label can never change the height (17.12). Sizes, heights per layout and the primary colour: 17.10.

| size           | classes (Standard)                  | height Standard / Compact | text px |
| -------------- | ----------------------------------- | ------------------------- | ------- |
| `xs`           | `h-[1.7143rem] px-2 text-xs`        | 24 / 24                   | 12      |
| `sm`           | `h-[2.1429rem] px-3 text-xs`        | 30 / 26                   | 12      |
| `md` (default) | `h-[2.4286rem] px-4 text-sm`        | 34 / 30                   | 13      |
| `lg`           | `px-5 py-2.5 text-base` (unchanged) | 40                        | 15      |
| `xl`           | `px-6 py-3 text-lg` (unchanged)     | 45                        | 16      |

Variants: `primary` (`bg-primary-700 text-white shadow-sm hover:bg-primary-800`), `secondary`, `outline`
(`border-gray-300 text-gray-700`; used for "+ เพิ่ม…" under a table), `danger`, new `dangerOutline`
(`border-red-200 text-red-700 hover:bg-danger-50`, the form footer's "ลบ"), `success`, `warning`, `info`,
`ghost` (`hover:bg-gray-100 text-gray-700`). Other solid variants hover at `/80`.

- Quick-add tinted button: `rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20`.
- Import: `<Button variant="ghost" size="sm" className="text-green-700!" leftIcon={file-excel icon}>`.
- Icon-only row action (outside forms; inside forms the row actions of 17.7 apply): `flex size-6 items-center justify-center rounded-md text-gray-400`, hover per action:
  edit `hover:bg-primary/10 hover:text-primary`, duplicate `hover:bg-gray-100 hover:text-gray-700`, delete
  `hover:bg-danger/10 hover:text-danger`. Always `aria-label` + `title`.

**daisyUI** sizes are re-pinned in `@layer daisyui` (`index.css`): `btn`/`input`/`select`/`textarea` md 13,
sm 12, xs 11, lg 15, xl 18; `badge`/`kbd` md 13, sm 12, xs 11, lg 15, xl 16. Prefer the shared components.

**Inputs** (`Input`, `Dropdown`, `Textarea`, `NumberInput`, `DatePickerInput`; all in
`src/shared/components/inputs/*`): **the one specification is 17.3** (height 36 Standard / 32 Compact, radius,
border, focus, error, read-only, disabled, suffix, counter). The rules that used to be here (35.5px height,
per-component focus colours, bare-text disabled fields inside the skins) are removed. What stays true:

- Editable = **white box with a drawn border**, always. A grey fill without a border was tried and rejected
  (users could not tell what takes input).
- `Dropdown compact` remains only for the pagination footer and list-page toolbars (outside forms).
  `dense` (Input, NumberInput, TDropdown, Toggle `size="sm"`) is the 21px input of the pricing-analysis
  grids, which have their own mock and are outside the form system. Inside forms, table cell inputs pass
  `cell` (28px in Compact, the plain Standard control in Standard; 17.7), never `dense`.

**Toggle** (`inputs/Toggle.tsx`) and **choice chips** (`RadioGroup` / `CheckboxGroup`, `variant="button"`):
specified in 17.5. The old rule (`md` option exactly the input height 35.5px, `bg-primary` pill with
`shadow-primary/25`) is removed.

**Assignment choices** (`appraisal/components/administration/SegmentedChoice.tsx`, Administration page only;
approved on the canvas boards 16 and 18, ticket #534). Outside the form system, so 17.5 does not apply:

- `variant="cards"` for the main decision (assignment type): one radio card per option, a row of equal columns
  once the card is 40rem wide (stacked below). Card `rounded-section border border-(--palette-line)
bg-(--palette-surface) px-3 py-2.5`, a 16px radio dot, label `font-semibold`, a one-line description
  `text-xs text-(--palette-gray-500)`. Selected: `border-primary bg-(--palette-accent-wash)` plus a 1px inset
  primary ring, label `text-(--palette-accent-ink)`. A disabled option is a `bg-(--palette-surface-2)` card
  whose description is replaced by a short reason; no opacity fade.
- `variant="segmented"` (default) for sub-choices (method, follow-up, keyer): track `h-ctl rounded-ctl border
border-(--palette-line) bg-(--palette-surface-3)`, options `h-8 rounded-ctl-c text-sm font-medium`; the selected
  option is a white pill (`bg-(--palette-surface)`, small shadow; dark `--palette-line-soft`, no shadow) with
  `text-(--palette-accent-ink)` semibold. The selected option's explanation is one grey hint line under the
  track (`mt-1.5 text-xs text-(--palette-gray-500)`), never a callout box.
- A locked group (read-only, quotation lock) keeps its selection visible in grey, not teal.

**Badge** (`Badge.tsx`): `inline-flex items-center gap-1.5 font-medium rounded-full`, dot on by default, `badgeStyle="soft"`.
Sizes: `sm` (default) `px-2 py-0.5 text-xs`; `md` `text-sm`; `lg` `text-base`; `xs` `text-[11px]`.
Colour by `tone` (`teal | green | yellow | gray`) or `type`+`value` (status, priority, channel…).
🔒 Add `whitespace-nowrap` at the call site in tables; the component does not set it.

**File chip** (`documentCard/DocumentFileChip.tsx`): `inline-flex max-w-[20rem] items-center gap-1 rounded-md border bg-white py-0.5 pr-1 pl-1.5 text-xs`,
selected `border-primary bg-primary/5`. Tile `FileBadgeIcon` sm: `grid place-items-center h-[1.3rem] min-w-[1.3rem]`, IMG `bg-blue-600`,
PDF `bg-red-600`, other `bg-gray-500`. Every child `items-center`; name `truncate` with the full name in `title`.

**SlideOverPanel**: header `px-6 py-4 border-b border-gray-200`, body `px-6 py-4`, optional pinned `footer`;
widths `md lg xl 2xl(70vw) full`. **Pagination**: `border-t bg-gray-50 px-4 py-2 text-sm`, 🔒 pages are 0-based.

## 10. Tables 🎨

**List page** (`RequestListingPage.tsx` is the reference)

```
<table className="w-full text-table">
thead: bg-gray-50 sticky top-0 z-10
th:    text-xs text-left font-semibold text-gray-600 px-4 py-2.5   (sortable: hover:bg-gray-100, active bg-primary/5)
tbody: divide-y divide-gray-100;  tr: hover:bg-gray-50 even:bg-gray-50/50
td:    px-4 py-2.5;  secondary line text-xs text-gray-400;  badges size sm
```

🔒 Do not combine daisyUI `table-xs` / `table-sm` with `text-table`: their cell rule beats the table-level class.

**Which size:** `text-table` (12.5) is for list and catalog pages (requests, tasks, monitoring, admin
maintenance) and the request title table. Tables inside a modal or a card keep `text-sm` (13) on purpose:
ProvideDocumentsTaskPage, AppraisalPicker, QuotationDocumentsDialog, PropertyGroupCard, MachinerySummaryTab,
and the appraisal summary/form tables. `th`, secondary lines and badges are 12 in both.

**Read-only detail table on request pages** (`titles/TitleTable.tsx` is the reference). _Editable tables inside
property forms and Block pages do not follow this list; they use the `FormTable` kit (17.7), which replaces
`denseTable` `TH`/`TD`/`FIELD`, the `constructionGrid` cell classes, `BlockTable` and the unit-table look._

- `table-fixed border-separate border-spacing-0 text-table tabular-nums`, `min-w-[..rem]`, column widths in rem
  via `<colgroup>`. Scroll box `max-h-[60vh] overflow-auto border-y border-gray-200`.
- `th`: `sticky top-0 bg-gray-50 border-b border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600`.
  `td`: `border-b border-gray-100 px-2 py-1 align-middle`. A two-line row (12.5 + 12) is 44.8px at 1440.
- Status column: `<Badge size="sm" className="whitespace-nowrap">` (12).
- 🔒 Stacking, lowest first: body cells, sticky body cells `z-[1]`, sticky `tfoot` `z-[2]`, header `z-10`, header
  corner `z-20`. Each layer sets its own z and background; never rely on class order.
- **Sticky actions column** on the right: `sticky right-0 z-[1] bg-inherit`, **no shadow line**. 🔒 Every row
  background must be opaque (white, `gray-50`, or the colour-mixed amber), or content shows through.
- **Collapse**: when the card is narrower than the table's full min-width, the icons fold into the ⋮ menu:
  edit / duplicate / delete first, then `<div role="separator" className="my-1 border-t border-gray-100" />`,
  then the other items. 🔒 Measure the card once (`TitleTableGroup` + `useCardIsWide`, threshold in rem via the
  root font size) so every table in the card collapses together.
- 🔒 Column sizing follows the **card** width: wrap in `@container` and use `@min-[..rem]:w-[..]` (TitleTable
  type/area), not viewport breakpoints.
- Dense rows: at most 2 lines per row. Cut with `truncate` + `title` (full text on hover) instead of wrapping.
  Chips are one line (`inline-flex max-w-full`, value `min-w-0 truncate`). Badges `whitespace-nowrap`.
- Numbers: right-aligned (`text-right`) with `tabular-nums`; empty value is `<span className="text-gray-400">—</span>`.
- 🔒 Rows open on click and on Enter (`tabIndex={0}`); inner buttons `stopPropagation`.

## 11. Toolbars, chips and uploads 🎨

- Toolbar row: `flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-4|5 py-2.5|3`; search
  is the shared `Input` with a `size-3.5` magnifier `leftIcon`; status/counter text `text-xs text-gray-500`.
- Filter chip: idle `border-gray-200|300 bg-white text-gray-600`; active is either solid
  `border-primary bg-primary font-medium text-white` (TitleToolbar) or tinted
  `border-primary bg-primary/10 font-semibold text-primary` (DocumentToolbar). Match the surface you are on.
- 🔒 **Uploads** (`DocumentUploader.tsx`, `utils/uploadFiles.ts`): the per-row picker is `multiple`
  (`.pdf,.png,.jpg,.jpeg`). `splitUploadable` drops files of the wrong type or over `MAX_UPLOAD_BYTES` and names
  them all in one `toast.error`; the rest go up through `runLimited`, `UPLOAD_CONCURRENCY` = 3 at a time, and a
  multi-file pick shows one success toast. Reuse these helpers; do not write another upload loop.
- 🔒 The title drawer's "เอกสารของโฉนดนี้" section is the same document card in scope mode
  (`TitleDocumentsSection`, `scope={{ titleIndex, heading }}`), not a second component.

## 12. Technical styling rules 🔒

- **No tailwind-merge.** `clsx` only concatenates; two conflicting utilities resolve by stylesheet order, not
  by order in the string. To override a component's class, use the `!` suffix (`text-green-700!`,
  `rounded-b-none!`) or change the class at its source. Never stack two `text-*` size classes.
- **`<Icon>` size**: `index.css` has an unlayered `.icon { width: 1em; height: 1em }`, which beats every layered
  utility, so `size-*` on `<Icon>` does not apply (confirmed in the built CSS). The icon is 1em of its
  font-size: size it with `text-*` on the icon or its parent, or `size-3.5!`.
- Prefer one theme token over repeating an arbitrary value. A new size or colour used in more than one
  place goes into `theme.css` (like `text-table`) or a shared constant.
- Tailwind v4 colour names are OKLCH; `text-red-600` is not the v3 hex. Read values from
  `node_modules/tailwindcss/theme.css`.
- Shared component with a size prop: keep the default, pass the override from the call site
  (`headingClassName`, `size`, `dense`). Do not change a shared default for one page.
- react-hook-form: no broad `watch()` in render or handlers (it subscribes the form root and re-renders the
  page on every keystroke). Use `useWatch({ control, name, compute })` in render and `getValues` in handlers.
  `useWatch` can return RHF's live array; never cache by array identity.
- No page-wide `:has()` or `.join` selectors in global CSS: each restyles the whole document on every
  DOM/focus change. daisyUI `join` is excluded in `index.css` for this reason; keep it excluded.
- Media queries stay px (rem queries resolve against 16px). Container queries may use rem.
- Before claiming what an element renders, read every matching rule in order or measure the computed style.

## 13. i18n 🔒

- Every visible string, `aria-label`, `title` and `placeholder` goes through `t()`, in `src/i18n/locales/{en,th,zh}/<namespace>.json`.
  The three files keep an identical key set, plural keys (`_one` / `_other`) included. Conventions: `src/i18n/README.md`.
- Reuse `common` keys (`actions.*`, `status.*`); feature keys go in the feature namespace, grouped by surface.
- `src/i18n/__tests__/localeParity.test.ts` only runs in the **full** suite; a path-filtered vitest run skips it.

## 14. Verification checklist for UI changes 🔒

1. `npx tsc -b --force` (incremental `-b` is unreliable here).
2. `npx vitest run`, whole suite. Read the `Errors` line too: an unhandled rejection exits 1 with every test green.
3. `npx prettier --write <each changed file>`; never a folder, never with an empty file list (it then formats the repo).
4. Measure computed sizes (font-size, height, padding) in a real browser at 1440 and 1920 widths.
5. Sticky columns: at `scrollLeft = 0`, compare `getBoundingClientRect()` of the last normal cell and the
   sticky cell; nothing may sit under it. Do not reason from `scrollWidth`.
6. Thai text: check that the top marks are whole, especially inside `overflow-hidden` boxes.
7. Screenshots before and after, and look at them.
8. Form screens (section 17): check Standard and Compact, a 1440 and a 1024 container (rail / strip, table / cards),
   light and dark, and the Thai strings of 17.12 in every control size.

## 15. Known deviations (do not copy) 📋

- `TitleTable` deed / holder / place columns still use viewport breakpoints (`min-[1400px]`, `min-[1700px]`);
  `DocumentTypeRow` uses `@max-[560px]` and px grid tracks.
- Missing document rows (`DocumentTypeRow`) are `bg-amber-50` with no left bar; title rows have the bar.
- The amber bar is the literal `#f59e0b`, not `var(--color-warning)`.
- px font literals remain: `Badge xs` `text-[11px]`, `FileBadgeIcon lg` `text-[11px]`, `Input dense` `text-[12px]`,
  `TitleNumbersField` `text-[15px]`, and many more in pricingAnalysis/appraisal (follow-up list).
- Filter bars, dialogs and admin pages keep a native `<select>` (OS menu, DOM `value` / `onChange(event)`) but draw
  it with `inputs/NativeSelect`, the 17.3 box (36px Standard), so it matches the `Input` beside it; a field that
  should look and behave like the rest of a form uses `Dropdown`. Still plain `<select>` on purpose: the workflow
  builder side panels (daisyUI `select-sm` next to daisyUI inputs), the pricing-analysis mock rows
  (`BulkRcnReferenceDialog`, `CreateReferencePopover`, `PricingAnalysisMethodBoardRow`, `CostOfBuildingTab`,
  `DiscountedCashFlowHighestBestUsed`), and the inline month / year pickers of the dashboard calendar and gallery sort.
- Outside property/Block forms, a few screens still use `FormCard` + `SectionHeader variant="card"` (icon tile,
  `rounded-2xl`). They are not form-system screens; do not copy that look into a property or Block form.
- The sign-in page (`LoginPage` and `LanguageSwitcher onDark`) uses fixed px and literal colours on purpose, so it
  matches the server-rendered identity provider pages pixel for pixel (no rem, no theme, 600px breakpoint).
- Comments in `Button.tsx` and `SectionHeader.tsx` still quote the old 14px / 16px sizes. The classes are
  right; trust the tables above.

## 16. Open decisions (do not decide; ask the user) 📋

- **Left sidebar menu**: A) 14px items, rem width about 256px, truncate + tooltip; B) keep 12px (`text-xs`
  today), rem width, truncate.
- Whether monitoring/admin catalog tables use `text-table` (applied for now).

## 17. Form system (Standard / Compact) 🎨

The single source of truth for every form control, field, section, editable table, property-page shell and
photo block. Design source: the "Property Form Redesign" canvas (Standard / Compact / narrow / States boards);
plan and phases: `docs/poc/form-standard-plan.md`. All sizes are rem at the 14px root with the px in
parentheses; at 1920px the root is 15px and everything scales with it (section 2). Classes are Tailwind v4;
`--palette-*` are the theme tokens of section 6.

### 17.1 Scope and mechanism

- **Standard is the default everywhere**: every form in the app that is not listed below, including Block pages.
- **Compact exists only on property form screens** (all property routes: land, building, condo, land-building,
  machinery and its summary, the four lease types, both PMA editors, and the Data Correction editor) **and
  follows the user's form-layout setting** (Standard / Compact). **Block pages are always Standard** and ignore
  the setting.
- Mechanism: `FormLayoutProvider` (`'standard' | 'compact'`) wraps the page shell; the shell reads the user
  setting, Block shells pass `'standard'`. Components call `useFormLayout()` and take their classes from one
  `{ standard, compact }` pair kept beside the component. No global CSS selects on the layout: the four
  skin files `formLayout*.css`, the `data-form-layout` attribute and every `cas-*` hook (`cas-form-grid`,
  `cas-sheet`, `cas-section-*`, `cas-table-*`, `cas-repeater` and the like) are gone. A form's `<form>` carries
  no layout class; a new form uses `FormSheet`/`FormSection`/`FormFields` (17.4, 17.6) and gets its look from
  them. Context crosses portals, so `Modal` and `SlideOverPanel` reset it to Standard: a dialog opened from a
  Compact sheet is still Standard.
- Two container queries drive the responsive behaviour. Both measure the **form's own width**, not the
  viewport (the left menu and the Application Details panel change it):
  - `@container/form-shell`, breakpoint **84.2857rem (1180px)**: at or above = _wide_ (right rail, wide tables
    scroll); below = _narrow_ (no rail, photo strip first, wide tables become cards).
  - `@container/sheet`, breakpoint **60rem (840px)**: Compact label-left rows hold two pairs at or above it,
    one pair below it.

### 17.2 Tokens (add to `theme.css`; use the utility, never the literal)

| Token                                 | Value                                                                               | Utility                | Used for                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------ |
| `--spacing-ctl`                       | 2.5714rem (36)                                                                      | `h-ctl`                | Standard control height                          |
| `--spacing-ctl-c`                     | 2.2857rem (32)                                                                      | `h-ctl-c`              | Compact control height, Standard chip height     |
| (spacing scale)                       | 2rem (28)                                                                           | `h-8`                  | Compact table-cell input, Standard toggle option |
| `--spacing-chip`                      | 2.2857rem (32)                                                                      | `h-chip`               | Standard choice chip                             |
| `--spacing-chip-c`                    | 1.8571rem (26)                                                                      | `h-chip-c`             | Compact choice chip and toggle option            |
| `--radius-ctl`                        | 0.5714rem (8)                                                                       | `rounded-ctl`          | Standard controls and buttons                    |
| `--radius-ctl-c`                      | 0.4643rem (6.5)                                                                     | `rounded-ctl-c`        | Compact controls and buttons                     |
| `--radius-section`                    | 0.8571rem (12)                                                                      | `rounded-section`      | Standard section card, header card               |
| `--spacing-rail` / `--spacing-rail-c` | 17.7143rem (248) / 14.5714rem (204)                                                 | `w-rail` / `w-rail-c`  | Right rail, Standard / Compact                   |
| `--form-input-bg`                     | light `--color-base-100`; dark `#151a21` (recessed: darker than the `#1c2129` card) | `bg-(--form-input-bg)` | Control and unselected chip fill                 |
| `--app-canvas`                        | light `--color-base-100`; dark `#13161c`                                            | `bg-(--app-canvas)`    | Page behind the cards (layout roots, `body`)     |

Neutral colours in forms: surface `--palette-surface`, tinted surface (label column, table head, read-only
fill) `--palette-surface-2`, band and toggle track `--palette-surface-3`, hairline `--palette-line-soft`,
frame `--palette-line`, control and chip border `--palette-input-edge` `#E0E7E9` (hover
`--palette-input-edge-hover` `#B7C4C9`; dark `#6B7380` / `#8A919D`). Light keeps the original soft edge, below 3:1 against the fill; the user chose it over 3:1 (2026-10-25), text `--palette-ink`, secondary text and placeholder `--palette-ink-2`.
Standard and Compact share these colours; **they differ in geometry only**.

### 17.3 Controls (all in `src/shared/components/inputs/*`)

One box for `Input`, `NumberInput`, `Dropdown` trigger, `DatePickerInput`, `parameter-search` and
`location-selector` fields. `Textarea` is the same box taller.

| Property      | Standard                                                                                                 | Compact                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Height        | `h-ctl` 2.5714rem (36)                                                                                   | `h-ctl-c` 2.2857rem (32); table cell input `h-8` 2rem (28)   |
| Padding       | `px-[0.8571rem]` (12), no vertical padding                                                               | `px-[0.7143rem]` (10); table cell input `px-[0.5714rem]` (8) |
| Radius        | `rounded-ctl` (8)                                                                                        | `rounded-ctl-c` (6.5)                                        |
| Border / fill | `border border-(--palette-input-edge) bg-(--form-input-bg)`; hover `border-(--palette-input-edge-hover)` | same                                                         |
| Text          | `text-sm leading-normal` (13 / 1.5) `text-(--palette-ink)`; placeholder `text-(--palette-ink-2)`         | same                                                         |

- **Vertical centring** comes from the fixed height, not padding: native inputs and selects keep `py-0`; a
  custom trigger is `flex items-center`. Never size a control with `py-*`. Never `overflow-hidden` on the box.
- **Focus** (one style, every text control, both layouts): `focus:outline-none focus:border-(--focus-edge)
focus:ring-[3px] focus:ring-(color:--focus-ring)` (`FOCUS` in `controlStyles.ts`; the variables carry the dark
  values, so no `dark:`). The old grey ring on `Dropdown` and `Textarea` is removed. In error state the ring is
  `--focus-ring-error` (red 20% / 30% dark) and the border stays red. Dropdown uses the same classes on its trigger
  and while its menu is open (`data-open`).
- **Error**: `border-danger text-danger-900` (dark: text `--palette-danger`), `aria-invalid`, message
  `mt-1 text-xs text-danger-600` (dark `--palette-danger`) under the control and linked with `aria-describedby`.
  A missing required value says "จำเป็นต้องกรอก" (`titleEntry.required`); other messages come from the schema.
- **Read-only (computed / derived) and disabled**: same box with `bg-(--palette-surface-2)
text-(--palette-ink-2)`, border kept, never bare text. Disabled adds `cursor-not-allowed`. A computed field
  carries a one-line helper under it (`mt-1 text-xs text-(--palette-ink-2)`) naming its source.
- **Read page** (whole page in read-only mode, `useFormReadOnly()`; approved 2026-10-25, canvas boards
  StandardRead / CompactRead): no control boxes, only label and value. Standard puts the label over the value
  in the same cell as the edit page: **same layout as edit** (positions, spans, line breaks); only controls become
  values. A denser read layout is parked.
  - **Values**: a choice group shows only the selected options, joined " · "; a number stays right-aligned,
    with its thousands separators, decimals and unit ("6.0 ปี", "ตร.ม."). An empty value is "—"
    (`text-(--palette-ink-2)`); an empty required value is "— ขาด" in `--palette-warn`.
  - **Not drawn**: the required mark (\*), edit-only buttons (add, delete, auto-fill, map picker) and the
    ActionBar. The section TOC with its status (17.8) stays. Tables use the read-only row (17.7).
- **Number with unit suffix**: the border and focus ring sit on a wrapper, the input inside is borderless,
  `text-right tabular-nums`, followed by the suffix `shrink-0 pl-2 pr-[0.8571rem] text-xs
text-(--palette-ink-2)` (`m`, `ตร.ม.`, `บาท`, `%`; the unit comes from the field config or the label). Property forms put the unit in the label instead ("ผิวจราจรกว้าง (ม.)") and draw no suffix; the suffix stays for table cells and pricing grids. The
  suffix's right padding equals the box's side padding (12 Standard, 10 Compact, 8 Compact cell). The
  wrapper uses `focus-within:` for the ring. Thousands separators and fixed decimals as configured.
- **Dropdown**: trigger is the box with `pr-[2.2857rem]` (32) and a trailing chevron icon 1.0714rem (15)
  `text-(--palette-ink-2)`, `pointer-events-none`, 0.7857rem (11) from the edge. Menu and options as the popover in
  section 8; selected option `bg-primary-50`. Placeholder text uses the placeholder colour.
- **Date**: the box with the calendar icon trailing, same icon size and inset as the chevron.
- **Textarea**: vertical padding `py-[0.5714rem]` (8) Standard / `py-[0.4286rem]` (6) Compact, horizontal as
  the box, `leading-normal`, `resize-y`. Minimum height by role: long text (remarks, descriptions)
  5.1429rem (72) / 4rem (56); short "อื่นๆ" text (max 100) 4rem (56) / 3.1429rem (44); the component reads
  "short" as `maxLength <= 100`. A textarea with `maxLength >= 1000` opens 5 rows tall (an explicit `rows` wins, `resize-y` stays, no auto-grow). **The counter is always on**: a row under the box, `n/max` right-aligned, `text-xs tabular-nums text-(--palette-ink-2)`, `n` and `max`
  with thousands separators (`31/4,000`), `mt-1`. The error message shares that row on the left. Every textarea
  therefore has a `maxLength` (default 4,000); `showCharCount` defaults to true and `false` is the only
  opt-out.
- **In-field icon button** (map picker, auto-fill name): inside the right edge, 2rem (28) Standard / 1.7143rem
  (24) Compact, `rounded-md`, `text-(--palette-ink-2)`, hover `bg-(--palette-surface-3)`; the input gets
  `pr-[2.5714rem]`. `aria-label` + `title`.

### 17.4 Fields and labels (`FormFields`)

`FormFields` renders the same field config in both layouts; only the field wrapper differs. The wrapper keeps
`data-field` (scroll-to-error target).

- **Required mark**: `*` after the label, `ml-0.5 text-(--palette-req)`. **Helper** `mt-1 text-xs
text-(--palette-ink-2)`; **error** as 17.3.
- **Standard**: label above the control, `block text-xs font-medium text-(--palette-ink) mb-1` (12/500; the palette ink, not `gray-700`, so dark needs no variant). Fields sit on
  a 12-column grid, `gap-x-[1.1429rem]` (16) `gap-y-[1.2857rem]` (18, the `FormSheet` standard body, so a label reads as belonging to its own control and not to the row above; the label-to-control gap stays `mb-1`); spans: 12 full, 6 half, 4 third, 3
  quarter. Wide shell: up to 4 per row (the main column is about 1040px). Narrow shell: at most 2 per row (spans
  3 and 4 become 6); chip groups, textareas and tables stay full width. **Exception, one rule in
  `FormFields`:** neighbouring fields whose spans add up to exactly one row (address ตำบล/อำเภอ/จังหวัด 6+3+3,
  ละติจูด/ลองจิจูด 6+6) are a _row group_. The first starts a row (`col-start-1`) and all keep their spans
  (`data-keep-row`) down to a shell of 48rem, so a pair never strands its last field on a row of its own;
  below 48rem the cascade above applies to them too. Compact has its own pairs and ignores this.
  **Chip groups take the whole row in Standard.** A `radio-group` or `checkbox-group` drawn as chips (not
  `variant: 'card'`) is always `col-span-12` in a Standard section body, whatever span its config or `pick()`
  gives it (`FormFieldShell` replaces the span; `rowGroupRoles(fields, true)` counts it as a full row), so two
  chip groups never share a row and the next field starts a new row. Boolean toggles, checkboxes, switches and
  inputs keep their spans and pair as before. Compact is unchanged: a chip group there is already a full pair, or half a
  row when it has at most 4 options. A form in a grid of its own (outside `FormSection`) keeps its spans. A chip group with `keepSpan: true` in its config keeps the span too (used by `noHouseNumber`, beside the house number). A field with `narrowSpan: 6 | 12` takes that span in a narrow shell instead of the 3/4 → 6 fallback (12 gives it a row of its own so its companion keeps 6 under it; used by the building name and the under-construction toggle).
- **Sub-heading inside a section** (e.g. "ที่อยู่ตามเอกสารสิทธิ์"): `col-span-12 text-sm font-semibold
text-gray-800` followed by a hairline (`border-t border-(--palette-line-soft)`).
- **Compact**: the field is a _pair_: a label cell and a control cell on one row.
  - Label cell: fixed column `10.8571rem` (152), `bg-(--palette-surface-2)`, `border-r border-(--palette-line-soft)`,
    `px-[0.8571rem] py-[0.3571rem]`, `text-xs font-medium text-(--palette-ink-2) leading-normal`, vertically
    centred; a long label may wrap to two lines.
  - Control cell: `px-[0.5714rem] py-[0.2857rem]`, flex wrap, `gap-x-[0.5714rem] gap-y-[0.2857rem]`; the row is
    `border-b border-(--palette-line-soft)` and 2.8571rem (40) high with a 32px control.
  - **Two pairs per row** in `@container/sheet` at or above 60rem; the right pair has `border-l
border-(--palette-line-soft)`. Below 60rem: **one pair per row**. Always full-width pairs (span both): chip
    groups, textareas, tables, and rows of several inputs.
  - **Several inputs in one pair** (address: ตำบล/อำเภอ/จังหวัด; distance/width/lanes): the pair's label names
    the group; each input is preceded by an inline mini-label `text-xs text-(--palette-ink-2)` and also has its
    own `aria-label`.
  - Helper and error go under the control inside the control cell, full-width (`basis-full`).

### 17.5 Choice controls

- **Radio pill / checkbox chip** (`RadioGroup` `default` and `button`, `CheckboxGroup`): `inline-flex
items-center rounded-full border text-sm leading-normal whitespace-nowrap`; a chip wider than its row gets
  `max-w-full truncate` and a `title`. There is one checkbox chip: `CheckboxGroup`'s `variant` (`tag`, `chip`,
  `button`) and `size` props are deprecated and ignored.

|                   | Standard                | Compact                   |
| ----------------- | ----------------------- | ------------------------- |
| Height            | `h-chip` 2.2857rem (32) | `h-chip-c` 1.8571rem (26) |
| Padding           | `px-[0.8571rem]` (12)   | `px-[0.7143rem]` (10)     |
| Gap between chips | `gap-[0.5714rem]` (8)   | `gap-[0.3571rem]` (5)     |

- Unselected: `bg-(--form-input-bg) border-(--palette-input-edge) text-(--palette-ink)`; hover `border-(--palette-input-edge-hover)`.
- Selected: `bg-primary-700 border-primary-700 text-white font-medium`; hover `bg-primary-800`. A checkbox chip
  also shows a check mark before the label (0.6429rem wide, 2px stroke, white, 0.4286rem gap); a radio chip
  shows none. Selecting "อื่นๆ" reveals the "Other" textarea (existing `showWhen`).
- Disabled: `bg-(--palette-surface-2) text-(--palette-ink-2) border-(--palette-line)`, selected-disabled
  `bg-gray-500 text-white`. Focus: the global outline (section 6).
- Semantics: radio = `role="radiogroup"` + `role="radio" aria-checked`; checkbox = `role="group"` +
  `aria-pressed`; the group is named by its label (`aria-labelledby`).
- **Boolean toggle** (`inputs/Toggle.tsx`): a two-option pill, `role="radiogroup"` of two `role="radio"`.
  Track `inline-flex rounded-full bg-(--palette-surface-3)`; options `rounded-full text-sm font-medium
leading-normal px-[1.1429rem]` (16) Standard / `px-[0.8571rem]` (12) Compact.

|               | Standard                            | Compact                   |
| ------------- | ----------------------------------- | ------------------------- |
| Track padding | 0.2857rem (4)                       | 0.1429rem (2)             |
| Option height | `h-8` 2rem (28)                     | `h-chip-c` 1.8571rem (26) |
| Whole control | 2.5714rem (36) = the control height | 2.1429rem (30)            |

Selected option `bg-primary-700 text-white`, no shadow; unselected `text-(--palette-ink)` (10.5:1 in light, 11:1 in dark; the same in Standard and Compact, which differ in
geometry only). Disabled: selected
option `bg-gray-500`, unselected `text-(--palette-ink-2)`, `cursor-not-allowed`. The option captions come
from the field config and are translated (section 13), e.g. "ตรวจสอบไม่ได้ / ตรวจสอบได้". `size="sm"` is
the 12px toggle of the pricing-analysis grids only; inside forms, `size` is never passed.

### 17.6 Sections (`FormSheet` and `FormSection`)

`FormSheet` is the form's root: it provides the layout context, the container queries and the vertical rhythm.
`FormSection` (`title`, `icon?`, `actions?`, `hint?`, children) is the only section component in forms; it
replaces `SectionHeader variant="card"` and `FormCard` inside forms, both `SectionRow` copies, the six local
copies, and `CondoSection`. Every `FormSection` has an `id` for the TOC and `scroll-mt` equal to the pinned tab
bar plus 1rem.

|                  | Standard                                                                                                                                                                                                                                        | Compact                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container        | `rounded-section border border-(--palette-line) bg-(--palette-surface) shadow-sm`, one card per section                                                                                                                                         | one sheet: `rounded-[0.5714rem] border border-(--palette-line) bg-(--palette-surface) overflow-hidden`, sections abut                                       |
| Between sections | `gap-[0.8571rem]` (12)                                                                                                                                                                                                                          | none (the band's own borders)                                                                                                                               |
| Header           | `flex items-center gap-2 px-4 py-[0.6429rem] border-b border-(--palette-line-soft)`: icon 1.0714rem `text-primary-700`, **no icon tile**, title `text-base font-semibold text-gray-800` (15/600); `hint` right `text-xs text-(--palette-ink-2)` | band `h-[2.4286rem]` (34) `px-[0.8571rem] bg-(--palette-surface-3) border-y border-(--palette-line)`, title 15/600, no icon; `actions` (links) at the right |
| Body             | grid of 17.4: `px-4 pt-[0.8571rem] pb-[1rem]`                                                                                                                                                                                                   | pairs edge to edge, no extra padding; tables full-bleed                                                                                                     |

One title per section: do not repeat it as a table label bar, and do not add a second heading above a table
that is the section's only content; the column headers and the totals row are enough.

### 17.7 Tables (`FormTable` family, `src/shared/components/form/`)

One kit for every editable or read-only table in forms: `FormTable` (columns, rows, `minWidth`, layout-aware),
`FormTableHead` (with two-level groups), `FormTableRow`, `FormTableCell`, `FormTableTotals`, `FormTableAdd`,
`FormTableEmpty`, `FormTableRowActions`. A column declares: header, `align` (`start | end | center`), width,
kind (`input | derived | text | action`), and its place in card mode. It replaces `denseTable` `TH`/`TD`/`FIELD`/
`NumCell`, `constructionGrid` cell classes, `BlockTable` and `blockTable.css`, and the units-table look.

|                           | Standard                                                                                                                                                            | Compact                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Table                     | `w-full border-separate border-spacing-0 text-sm tabular-nums`; **no outer box**, it sits in the section body                                                       | `w-full border-collapse text-sm tabular-nums`, full-bleed in the sheet                                                           |
| Header cell               | `text-xs font-medium text-(--palette-ink)`, `px-[0.5714rem] py-[0.5714rem]`, only `border-b border-(--palette-input-edge)`, no fill; first cell `pl-0`, last `pr-0` | `h-8` (28) `px-[0.5714rem] bg-(--palette-surface-2) text-xs font-medium text-(--palette-ink-2) border-b border-(--palette-line)` |
| Group header (two levels) | group cell centred `font-semibold` with `border-b border-(--palette-line-strong)`; sub-headers below                                                                | same on the tinted head                                                                                                          |
| Body cell                 | `px-[0.5714rem] py-[0.5714rem] border-b border-(--palette-line-soft)`; the cell input is the **Standard control** (36), so an edit row is 3.7143rem (52)            | `h-ctl` (36) row, `px-[0.5714rem] py-[0.1429rem] border-b border-(--palette-line-soft)`; the cell input is 28px (`h-8`)          |
| Read-only row             | same padding, plain text, no input                                                                                                                                  | same                                                                                                                             |
| Numbers                   | header and cells `text-right tabular-nums`, 2 decimals unless the field says otherwise, unit in the header "(ตร.ม.)"                                                | same                                                                                                                             |
| Empty value               | `—` in `text-(--palette-ink-3)`                                                                                                                                     | same                                                                                                                             |
| Index column              | `#`, 2.8571rem (40), centred, `text-(--palette-ink-2)`                                                                                                              | same                                                                                                                             |

- **Cell error**: red border on the cell input (17.3) and the message under it (`text-xs text-danger-600`); the
  row grows by one line. Same in both layouts.
- **Totals row** (`FormTableTotals`, a `<tfoot>`): label in the description column "รวม · n รายการ" (a new `common` plural key with `{{count}}`, for example `table.totalItems`; a feature key such as
  `titleEntry.list.total` stays where the noun differs), totals in their numeric columns, `font-bold` (700). Standard:
  `border-t border-gray-400` (1px), `py-[0.8571rem]` (12), no fill. Compact: `h-[2.4286rem]` (34),
  `px-[0.6429rem]` (9; at least 8 so a total never touches the cell edge),
  `bg-(--palette-surface-2) border-t border-(--palette-line-strong)`.
- **Add action** (`FormTableAdd`): Standard = `Button variant="outline" size="sm"` with a plus icon,
  "+ เพิ่ม…" (e.g. เพิ่มพื้นที่, เพิ่มเอกสารสิทธิ์), under the table, left-aligned, `mt-[0.7143rem]`; several adds
  (building: อาคาร / ส่วนพัฒนา) sit side by side with `gap-[0.5714rem]`. Compact = a link in the section band
  `actions`: `text-xs font-semibold text-primary-700 hover:underline`, prefixed "+ ", several separated by
  `gap-[0.7143rem]`; a table with its own `FormTableHeading` (`FormTableBlock`) puts it at the right end of that
  heading instead. The empty state keeps its own add button (below).
- **Row actions** (`FormTableRowActions`, last column, right-aligned, always visible): move up, move down,
  delete (only the ones the table supports). Icon button 2rem (28) Standard / 1.7143rem (24) Compact,
  `rounded-md`, icon 1.0714rem `text-(--palette-ink-2)`; hover `bg-(--palette-surface-3)`, delete hover
  `bg-danger-50 text-danger-600`; a move button at the end of the list is `disabled:opacity-40`. Delete is the
  two-step `ConfirmDeleteButton`. Always `aria-label` + `title` with the row number.
- **Empty state** (`FormTableEmpty`): replaces the whole table (no header). Dashed box
  `border border-dashed border-(--palette-line-strong)`, centred, icon 1.5714rem (22) `text-(--palette-ink-2)`,
  message `text-sm text-(--palette-ink-2)`, then a small outline add button. Standard
  `rounded-[0.7143rem] py-[1.4286rem]`; Compact `rounded-[0.4286rem] py-[1rem]`.
- **Wide tables** (declare `minWidth`; e.g. the 13-column depreciation table, about 92rem):
  - Wide shell: the table scrolls horizontally inside the section body (`overflow-x-auto`); the **first column
    and the action column are frozen** (`sticky left-0` / `sticky right-0`, opaque `bg-(--palette-surface)` on
    head, body and totals, `z-[2]`, a 1px inset divider `shadow-[inset_-1px_0_0_var(--palette-line-soft)]`
    (mirrored on the right for the action column)). Stacking and the opaque-row rule of section 10 apply.
  - When the element holding the table is **narrower than its `minWidth`** the table **switches to cards
    automatically**, whatever the shell around it measures (a table switches to cards when it is wider than
    its container, not only below 1180px). Tables whose `minWidth` fits stay tables and scroll only past it. The
    decision is `useTableCards`; it needs a `@container/form-shell` around, and stays a table until the first
    layout so cards never flash.
  - **Card mode** (one card per row, Standard controls): card `rounded-[0.7143rem] border border-(--palette-line)
overflow-hidden`; header strip `bg-(--palette-surface-2) px-[1.1429rem] py-[0.4286rem] text-xs font-semibold`
    with "n · title" and the row actions; input zone = 12-column grid (17.4 gaps) where each cell is a labelled
    Standard field (the column header becomes the label); results strip `bg-(--palette-surface-2) border-t`, four
    columns of label (`text-xs text-(--palette-ink-2)`) over value (`text-sm font-semibold tabular-nums
text-right`) for the `derived` columns; sub-forms such as the age-band editor sit between the zones. After
    the cards: the totals row (same style as above, as a grid), then the add action. Each column declares its
    zone (`title | input | result`) and card span.

### 17.8 Property page shell

- **Identity header** (Standard): card `rounded-section border border-(--palette-line) bg-(--palette-surface)
shadow-sm`. Row 1 `px-4 py-[0.7143rem]`: type pill (`rounded-full px-2.5 text-xs font-medium` soft fill,
  border and text in the property type's tone from `getTypeDotColor`), the property name `text-base
font-semibold`, meta `text-xs text-(--palette-ink-2)` (room · floor · building, and the like). Row 2 = tabs.
  Compact: an identity band `min-h-[3.1429rem]` (44) and the tab row `h-[2.4286rem]` (34) in one frame with the
  sheet below (the frame has no radius at the joint).
- **Tabs**: underline tabs, row `h-ctl` (36) Standard / 34 Compact, `border-t border-(--palette-line-soft)`;
  tab `px-3 text-sm font-medium text-gray-600`, active `text-primary-700 border-b-2 border-primary-600`.
  A form with one tab still shows the tab row. The header card scrolls away and the tab row stays pinned.
- **Wide shell (container ≥ 84.2857rem)**: two columns, main `minmax(0,1fr)` + a **sticky right rail** `w-rail`
  (17.7143rem, 248) Standard / `w-rail-c` (13.7143rem, 192) Compact, column gap 1.1429rem (16) / 0.8571rem (12).
  The rail is `sticky self-start` at `top` = pinned tab height + 0.8571rem and contains, top to bottom: the
  photo card (17.9), then the **section TOC** card.
  - TOC card: Standard `rounded-section border bg-(--palette-surface) p-[0.7143rem]`, heading "ในหน้านี้"
    `text-xs font-semibold text-gray-600`, one link per `FormSection` (scroll-spy): `block rounded-lg px-[0.7143rem]
py-1 text-sm text-gray-700 hover:bg-gray-100`, active `bg-primary-50 text-primary-700 font-semibold` (dark:
    `--palette-accent-wash` / `--palette-accent-ink`). Compact: no heading, links `text-table`, `px-2 py-0.5`.
- **Narrow shell (< 84.2857rem)**: **no rail and no TOC**. The photo gallery strip is the **first section** of the
  form, titled "รูปภาพ" with the hint "รูปแรกจะเป็นภาพหน้าปก" (`editorHeader.firstIsCover`). The form is one
  column; fields per row follow 17.4; wide tables follow 17.7.
- **Bottom action bar** (`ActionBar`, sticky, full width of the shell): `border-t border-(--palette-line)
bg-(--palette-surface) px-6 py-[0.7143rem] shadow-[0_-0.2857rem_1rem_rgb(16_24_40/0.06)]` (Compact
  `py-[0.5714rem]`). Left: "ยกเลิก" (`ghost`), "ลบ" (`dangerOutline`, where deletion is allowed), then the unsaved
  indicator "มีการแก้ไขที่ยังไม่บันทึก" (`role="status"`, `text-xs font-medium text-(--palette-warn)`, a
  0.5rem `bg-amber-500` dot before it) only while dirty. Right: "บันทึกร่าง" (`ghost`) and "บันทึก"
  (`primary`, check icon). Hidden in read-only mode. Buttons take their layout's heights (17.10).
- **Missing fields** (how a form reports errors; `src/shared/components/form/missing/`):

  | Case                                                                                                                 | How errors show                                                                                                                                                                                               |
  | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Form with a bottom `ActionBar` (property pages, Block, Data Correction, Request, market comparable, supporting data) | "ขาด n ช่อง" chip in the ActionBar, left of Save Draft, plus inline field errors. Never a banner at the top of the form.                                                                                      |
  | Pricing (Save is in the top bar)                                                                                     | An explicit `<MissingFieldsChip placement="down" />` next to Save in the top bar. A hand-built footer would take `placement="up"` (the default). Decision Summary has none: its schema has no required field. |
  | Short forms in a modal or dialog                                                                                     | Inline field errors only, no chip (there is no `ActionBar.Right`).                                                                                                                                            |
  | Errors with no field path (server 400, workflow completion)                                                          | Shown near the action that failed or in its confirm dialog, never as a banner on top of the form.                                                                                                             |
  - **Wiring**: the shared `FormProvider` always runs it; there is no banner mode and no `errorSummary` prop. Pass
    `fields` = the configs the schema was built from so conditional "required when X" fields count early. Pass
    `renderedOnly` when the schema also flags fields the user cannot fill in (the hidden half of an either/or pair).
    `missingSummary={false}` is only for a page that runs its own provider (Request). `ActionBar.Right` renders
    `MissingFieldsChip` first, and not in read-only mode. A page with no `ActionBar.Right` places the chip by its Save.
  - **A rule the schema does not hold** (Data Correction's reason) joins the schema the form validates with
    (`z.intersection`), so the resolver, the required mark and the chip all see it.
  - **Count is live**: re-checked 300 ms after the last edit, "ขาด n ช่อง" amber (`--palette-warn`), or the green
    "ครบถ้วน" pill at 0.
  - **A failed Save** opens the popover and announces the count to screen readers (a visually hidden
    `aria-live="polite"` region; "ครบถ้วน" once the form then gets to 0). Live recounts while typing are silent.
    It does not auto-scroll.
  - **Popover**: opens upward, grouped by `FormSection` title (a field outside every one under "อื่นๆ") in page
    order, each row "ไปที่ช่อง". Two same-named fields in a section are told apart by the sub-heading above each.
    A control that stands for fields it does not draw (the pricing template picker, whose popover is closed) carries
    `data-field-aliases="a b"` and registers a reveal that opens the popover. Every registered reveal is asked; each acts
    only on a path it owns. A jump that finds no field falls back to the section, then the form scroller, then the
    window top, so "ไปที่ช่อง" always moves the page.
    A tabbed page registers `useRegisterMissingReveal` so the jump switches to the field's tab first (the property
    header, Data Correction's tabs, and `MethodTabs` for every pricing panel). A row of an array reads "{label}
    รายการที่ n" unless every row draws a label of its own (a template's factors).
  - **Save Draft never validates.** Field errors stay inline under their control. Labels are the ones the page
    draws, so they are already translated: `data-field-label`, then `aria-label`, then the field's `<label>`.
    A bare grid control (no label of its own, `data-grid-cell` or a named `<input>`) reads from where it sits:
    its row's first cell plus the column header(s) in a `<table>` ("ทำเล · ตลาด A · คะแนน"), or the label cell of a
    `data-label-row` row. Put `data-field` on the control itself, never a wrapper, in a grid.
  - **The banner is gone.** `FormErrorAlert` and the scroll-to-first-error on submit were removed; a failed Save
    opens the popover and the user jumps from there.
  - **Validation messages are i18n tokens, never English literals.** A schema message is `vmsg('maxLength',
{ max: 100 })` (`src/shared/components/form/validationMessage.ts`; a bare name is a key under
    `common:validation.`, `'ns:full.key'` names another namespace), not a sentence and not a `t()` call: `t()` freezes
    the language the message was made in, a token is translated where it is shown. Every control renders its `error`
    through `<ValidationText>`, which fills `{{label}}` with the label of its field (`FormFieldShell` provides it,
    or the control's own `label`), uses the `_labeled` variant of the key when there is a label ("กรุณาระบุ{{label}}")
    and the plain one when there is not ("จำเป็นต้องกรอกข้อมูลนี้"). A plain string still renders as it is. A
    new control that shows an error uses `ValidationText` too; add the key to th, en and zh. Zod's own defaults
    ("Required", "Invalid") are mapped to tokens by the error map installed in that file. A schema factory that
    takes a `t` (`makeXSchema(t)`) is built once with `tokenT('ns')`, not with the live `t`. Any place that prints
    an RHF error itself (`{errors.x.message}`) wraps it in `<ValidationText message=... />`: a raw token must never
    reach the screen.

### 17.9 Photo card and strip (one shared component, `src/shared/components/` photo aside/strip)

One component, two presentations chosen by the shell (rail present = card, absent = strip). It replaces Block's
`CondoPhotoAside` and `PropertyPhotoSection`'s tile layout. Photo actions (set cover, remove cover, view, delete)
stay as in `photoGallery.*`.

- **Card** (in the rail): `rounded-section border bg-(--palette-surface) p-[0.8571rem] grid gap-[0.7143rem]`
  (Compact: `rounded-[0.5714rem] p-[0.5714rem] gap-[0.5714rem]`).
  - **Cover**: `aspect-[4/3] rounded-[0.7143rem]` (Compact `rounded-[0.4286rem]`), `object-cover`, with the
    badge "รูปปก" (`photoGallery.cover`) at the top-left, 0.5714rem from the edges: `rounded bg-amber-400
text-[#422006]` (the `warning` content colour) `px-1.5 text-xs font-semibold leading-normal`. Dark text on
    yellow is mandatory (white on `amber-400` fails contrast).
  - **Thumbnails exclude the cover** (the cover is never repeated): a 4-column grid `gap-[0.4286rem]`, tiles
    `aspect-square rounded-lg`, then the **"+" tile** as the last cell (dashed `border-(--palette-line-strong)`,
    plus icon, opens the add dialog). At most 7 thumbnails; beyond that the 7th carries a `+N` overlay
    (`bg-black/55 text-white text-base font-semibold`). A "ดูทั้งหมด n รูป" link (`text-xs text-primary-700`) under
    the grid opens the gallery tab.
  - **One photo** = cover only: the thumbnail grid contains just the "+" tile.
  - **No photos (empty state)**: the whole 4:3 box is one button: dashed border, `bg-(--palette-surface-2)`,
    centred plus icon and the text "คลิกเพื่อเพิ่มรูปภาพ" (`photoGallery.addPicture`, `text-xs
text-(--palette-ink-2)`), hover `bg-(--palette-surface-3)`; no thumbnail grid, no separate add button.
- **Strip** (narrow, inside the first `FormSection`): the original gallery layout, `flex items-center gap-2
overflow-hidden`: first the add tile `w-[10.5714rem] h-28` (148 × 98; dashed `border-gray-300`, plus icon and
  "คลิกเพื่อเพิ่มรูปภาพ" `text-xs`), then the photos `w-36 h-28` (126 × 98) `rounded-lg`, in order. **The cover is
  the first photo** (not repeated anywhere): `ring-2 ring-amber-400` and the same "รูปปก" badge at 0.2857rem from
  the corner. The number of visible photos is `floor((width − 148) / (126 + 8))`, at least 1; when photos
  overflow, the last visible one carries the `+N` overlay (N = total − visible + 1) and opens the gallery.
  Empty: just the add tile.

### 17.10 Buttons (`shared/components/Button.tsx`)

The size table is in section 9; `Button` reads `useFormLayout()` and takes the Compact heights inside a Compact
form (and nowhere else). **What changes in the shared Button**: `sm` becomes 2.1429rem (30) from 28.5; `md` an
explicit 2.4286rem (34) from 33.5; radius `rounded-md` becomes `rounded-ctl` (`rounded-ctl-c` in Compact);
`primary` fill `bg-primary` becomes `bg-primary-700` (hover `primary-800`); the offset focus ring is replaced
by the global outline; new variant `dangerOutline`. These apply app-wide, not only in forms.

| Use in a form                                      | Variant and size (Standard / Compact height)     |
| -------------------------------------------------- | ------------------------------------------------ |
| บันทึก                                             | `primary` `md`, check icon (34 / 30)             |
| บันทึกร่าง, ยกเลิก                                 | `ghost` `md`                                     |
| ลบ (page level)                                    | `dangerOutline` `md`                             |
| "+ เพิ่ม…" under a Standard table, empty-state add | `outline` `sm` (30 / 26), plus icon              |
| Compact add link in a band                         | text link, not a Button (17.7)                   |
| Photo "เพิ่มรูป", "ดูทั้งหมด" link                 | `outline` `sm` / `text-xs text-primary-700` link |

`outline` borders use the control edge `--palette-input-edge`; `ghost` is borderless (`border-transparent`) with no fill
in both layouts, hover `--palette-surface-3`, so ยกเลิก and บันทึกร่าง look the same in Standard and Compact; `outline`, `ghost` and `dangerOutline`
text and hover read `--palette-ink` / `--palette-surface-3` / `--palette-req*`, so they hold 4.5:1 in dark. The solid
colours use a shade that holds 4.5:1 with white text: `danger-600`, `green-700` (success), `blue-700` (info);
`warning` uses `warning-content`; `secondary` uses `secondary-content`. Icon-only buttons are 17.7's row-action
size. A disabled button is a grey fill, not a faded one: `bg-(--palette-surface-3) text-(--palette-ink-2)
border-(--palette-line) shadow-none cursor-not-allowed` (7.3:1 in dark; `opacity-50` drops the label below 4.5:1).
A loading button (`isLoading`) keeps its colours and shows `cursor-wait`.

### 17.11 Colours in forms

- **Filled control fill** (primary button, selected chip, selected toggle option): `primary-700` `#0F766E`,
  hover `primary-800` `#115E59`; text white (5.5:1). `primary-600` (`#0D9488`) is not used behind white text.
- **Focus**: text controls `--focus-edge` border with a 3px `--focus-ring`; everything else the global 2px
  `--focus-edge` outline, offset 2px (section 6).
- Links and icons accent: `text-primary-700`; active tab underline `primary-600`.
- Error: border `danger` `#EF4444`, text `danger-600` `#DC2626` (4.8:1); required mark `--palette-req`.
- Warning (unsaved dot, mismatch banner): `amber-500` dot, text `--palette-warn`, banner `--palette-warn-wash`
  with `border-amber-200` (section 7).
- Cover badge: `amber-400` with `#422006` text.

### 17.12 Thai text

Stacked Thai marks (ชั้น, ญี่ปุ่น, ปิ่น, ฟ้า) and descenders (ฎีกา, ฏ, กู้, ผู้) must never clip. Rules:

- **Line height is 1.5 (`leading-normal`) for every Thai text in a control**, including inside inputs, chips,
  toggle options, buttons, labels and cells. No `leading-tight`, `leading-none` or `leading-[1.x]`.
  **Exception: a native `<input>` is 1.8.** `index.css` ("Thai in text inputs") sets that, unlayered, because
  the browser clips an input's text to its line box (measured: 1.5 shows 95.5% of the ink, 1.8 all of it).
  The fixed height (17.3) keeps the text centred, so the box does not change; do not add `leading-normal`
  to an `<input>` (it is inert). Triggers, textareas, chips and buttons use 1.5.
- **Minimum box heights** (measured at 3× zoom with 13px Roboto + Sarabun, no clipping at any of these):
  text control 2.5714rem (36) Standard / 2.2857rem (32) Compact / 2rem (28) table cell input; choice chip and
  toggle option 1.8571rem (26) Compact / 2.2857rem (32) and 2rem (28) Standard; tab row 2.4286rem (34) minimum;
  section band 2.4286rem (34); Button `sm` Compact 1.8571rem (26). **No control goes below these.**
- Height is set with `h-*`; vertical padding never sizes a control (17.3). No `overflow-hidden` on a control
  or a chip; use `truncate` (section 4) when a single line must be cut.
- The self-hosted Sarabun has taller marks than the fallback used for the measurement. The QA phase repeats the
  check in the real app at 1440 and 1920 with the strings above at every size in this list.

### 17.13 Dark mode

Dark follows `[data-theme=dark]`. Because forms use `--palette-*` and `--form-input-bg` (17.2), no component
needs a `dark:` colour for neutrals; check these specifically:

- Dark is a slate ramp (hue ~217), layered: canvas `#13161c` < control fill `#151a21` (recessed) < card
  `#1c2129` (`--palette-surface`, `--color-base-100`) < `--palette-surface-2` `#20262f` (Compact label
  column, table head) < `--palette-surface-3` `#242a33` (bands, toggle tracks) < `--palette-line-soft`
  `#2c3138` < `--palette-line` `#383d44` < `--palette-line-strong` `#50565f` <
  `--palette-input-edge` `#6B7380` < `--palette-input-edge-hover` `#8A919D`. Accent wash `#173735`. `--color-base-100/200/300` and
  `--color-base-content` are set in the daisyUI dark theme block in `src/index.css` (not theme.css:
  daisyUI's own `@layer base` values outrank the `theme` layer). `--palette-ink-2` / `-3` are 72% / 58%
  mixes of `#e5e7eb`: on the card 7.4:1 / 5.3:1, on surface-3 6.8:1 / 5.0:1.
- Selected chip, toggle option and primary button keep `primary-700` with white text, hover `primary-800` in
  dark too: white on `primary-600` is 3.7:1, below the 4.5:1 floor. Links and tinted text that sit on the dark
  surface use `--palette-accent-ink`, not `primary-700` (2.4:1 on dark).
- Error text and message `--palette-danger` (`#fca5a5`); required mark `--palette-req` (`#f87171`).
- TOC active link `--palette-accent-wash` background with `--palette-accent-ink` text.
- Frozen table columns, the totals row and the action bar use opaque `--palette-surface` (no transparency,
  or scrolled content shows through).
- The cover badge stays `amber-400` with dark text; photo placeholders and overlays are unchanged.
- Section card `shadow-sm` is acceptable; the border carries the separation.
- **Feature code uses palette tokens, not raw neutral classes.** Write `bg-(--palette-surface)`, `text-(--palette-ink)`
  / `-ink-2`, `border-(--palette-line)`, never `bg-white`, `text-gray-*`, `border-gray-*`. A tinted wash or strong
  coloured text that has no token (`bg-blue-50`, `text-purple-700`, `border-green-200`) needs a `dark:` pair on the
  same class string (`bg-blue-50 dark:bg-blue-500/10`, `text-purple-700 dark:text-purple-300`,
  `border-green-200 dark:border-green-500/30`). Exempt: paper/report previews, maps, charts, the workflow canvas,
  the 3D scene, text and overlays on photos, and decorative knobs.

### 17.14 Target components and what they replace

| Target                                                                                                                                                       | Replaces                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormLayoutProvider`, `useFormLayout()`                                                                                                                      | `data-form-layout`, `.cas-form-grid`, the `grid` / `classic` gating                                                                                                                                                                         |
| `inputs/*` (Input, NumberInput, Dropdown/TDropdown, Textarea, DatePickerInput, RadioGroup/CheckboxGroup chips, Toggle)                                       | `dense` / `compact` variants inside forms, per-component focus, `showCharCount`, skin overrides                                                                                                                                             |
| `FormFields`                                                                                                                                                 | label-left/label-above CSS in the skins                                                                                                                                                                                                     |
| `FormFieldShell`                                                                                                                                             | the `[data-field]` wrapper and label of a field. `FormFields` uses it; a hand-built field in a form (a toggle, a derived figure) wraps itself in it to lay out like its neighbours                                                          |
| `FormSheet`, `FormSection`                                                                                                                                   | `SectionHeader variant="card"` and `FormCard` in forms, both `SectionRow` copies, six local copies, `CondoSection`                                                                                                                          |
| `FormSubheading`                                                                                                                                             | `FieldGroupLabel`; the 13/600 sub-heading inside a section (17.4)                                                                                                                                                                           |
| `FormSectionsProvider`, `useFormSections()`                                                                                                                  | the shell's table of contents: every `FormSection` registers `{ id, title, icon }` in page order                                                                                                                                            |
| `FormShell`, `FormShellBody` (`appraisal/components`); `PropertyFormShell`, `ComparableFormShell` and Block's `CondoDetailShell` are thin wrappers over them | the per-page assembly: `FormShell` is the scroller (`#form-scroll-container`, `--form-scroll-offset`, the pinned header); `FormShellBody` is the `@container/form-shell` body with the photo rail or strip and the section TOC (17.8, 17.9) |
| `FormTable` family                                                                                                                                           | `denseTable`, `constructionGrid` cell classes, `BlockTable`, `blockTable.css`, units-table look                                                                                                                                             |
| Photo aside / strip                                                                                                                                          | Block `CondoPhotoAside`, the old property photo section layout                                                                                                                                                                              |
| `Button` (17.10)                                                                                                                                             | the old size table, `ring-offset` focus                                                                                                                                                                                                     |
| `src/styles/formLayout*.css`                                                                                                                                 | deleted (about 5,100 lines) with every `cas-*` class and dead hook                                                                                                                                                                          |

- The root step-up to 15px at >= 1920 (kept for now).
