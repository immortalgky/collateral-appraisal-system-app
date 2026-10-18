# DESIGN.md: Collateral Appraisal FE design standard

Read this before any UI change. Every value below is taken from the code; the file that owns it is named so
you can check it. If the code and this file disagree, the code is what renders. Fix one or the other, never
both silently. Pixel values are given **at the 14px root** (viewport below 1920px, density `normal`).

## 1. Where the styling lives

| File | Owns |
|---|---|
| `src/index.css` | Root size (`--cas-root-step`, `--cas-density`, `--cas-leading`), fonts, daisyUI size overrides, `.truncate` override, global focus outline, `.icon` |
| `src/styles/theme.css` | Colour tokens, type scale, `text-table`, line height, `--palette-*` / `--dc-*`, dark overrides |
| `src/shared/components/densityConstants.ts` | Density factors |
| `src/styles/formLayout.css` | Appraisal form `grid` layout (only under `.cas-form-grid`) |
| `src/styles/formLayoutCompact.css` / `formLayoutStandard.css` / `formLayoutSkin.css` | Form skins `grid` (compact) / `classic` (standard) / rules shared by both. Imported in that order in `main.tsx`; Skin must stay last |
| `src/shared/components/` | Button, Badge, Card, Input, inputs/*, sections/*, Pagination, SlideOverPanel |

Stack: React 19, TypeScript, Vite, Tailwind v4.2 (CSS-first `@theme`), daisyUI 5, Headless UI, `clsx`.
There is **no tailwind-merge** (see section 12).

## 2. Root size: 1rem is not 16px

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

## 3. Type scale (`theme.css`)

Since 2026-10-10 the scale sits one step under the Tailwind defaults, to match the mocks.

| Class | rem | px @14 | px @15 |
|---|---|---|---|
| `text-xs` | 0.8571 | 12 | 12.9 |
| `text-table` (custom: table rows, half a step under body) | 0.8929 | 12.5 | 13.4 |
| `text-sm` | 0.9286 | 13 | 13.9 |
| `text-base` | 1.0714 | 15 | 16.1 |
| `text-lg` | 1.1429 | 16 | 17.1 |
| `text-xl` | 1.2857 | 18 | 19.3 |
| `text-2xl` | 1.5714 | 22 | 23.6 |
| `text-3xl` | 2 | 28 | 30 |

`text-4xl` and up are unchanged. Line height: `text-xs` to `text-2xl`, `text-table` and `html` all use
`--cas-leading` = **1.5** (`index.css`).

Fonts: `'Roboto Variable'` (Latin, digits) then `Sarabun` (Thai subset only), self-hosted. Weights 400/500/600/700.
No italic face is loaded.

## 4. Thai text and `truncate`

`index.css` overrides Tailwind's `truncate` inside `@layer utilities`:

```css
.truncate        { overflow-x: clip; overflow-y: visible; }
:where(.truncate) { min-width: 0; min-height: 0; }
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

## 5. Type roles

| Role | Classes | px @14 |
|---|---|---|
| Body, input text, Button md | `text-sm` | 13 |
| Field label | `block text-xs font-medium text-gray-700` (+ `mb-1`) | 12 / 500 |
| Required mark | `<span className="text-danger ml-0.5">*</span>` | - |
| Caption, helper, error, secondary line | `text-xs` (`text-gray-500`, error `text-danger`) | 12 |
| Table header `th` | `text-xs font-semibold text-gray-600` | 12 / 600 |
| Table rows: list/catalog pages and TitleTable | `text-table` on `<table>` | 12.5 |
| Table rows: modal and in-card tables | `text-sm` on `<table>` | 13 |
| Table secondary line | `text-xs text-gray-400`/`text-gray-500` | 12 |
| Status badge | `<Badge size="sm">` (default) | 12 |
| Card heading, every page (FormCard, SectionHeader `variant="card"`, Card, DocumentCardHeader) | `text-base font-semibold text-gray-800` (`headingClassName` default) | 15 / 600 |
| Page header (SectionHeader default with icon, list page `h3`) | `text-base font-semibold` | 15 |
| In-card sub-section (SectionHeader default, no icon) | `text-sm font-semibold text-gray-800` + `hr` | 13 / 600 |
| Table group heading inside a card (TitleTable) | `text-sm font-semibold text-gray-600`, count `text-xs` | 13 / 12 |
| Title drawer title | `text-base font-semibold` | 15 |
| Drawer body section heading | `text-sm font-semibold text-gray-800`, `border-b border-gray-100 pb-1.5` | 13 |
| SlideOverPanel title / subtitle | `text-lg font-semibold` / `text-sm text-gray-500` | 16 / 13 |
| Toggle md option | `text-sm` medium | 13 |
| Toolbar text action (expand/collapse/show preview) | `text-xs text-gray-600 hover:text-gray-900`, icon `size-3` | 12 |
| Filter chip | `rounded-full border px-3 py-1 text-sm`, count `text-xs tabular-nums` | 13 / 12 |
| File chip name, banner text | `text-xs` | 12 |

Hierarchy rule: card heading (15 semibold) > in-card section (13 semibold) > body (13 regular), each one step
apart in size or weight. No ad-hoc sizes outside the scale; the user rejects tiny custom sizes. The only
allowed sub-scale size is the label inside the file-type tile (`FileBadgeIcon` sm, `text-[0.7143rem]` = 10px).
`headingClassName` stays on FormCard / SectionHeader / DocumentCardHeader for a page that truly needs
another size; no page passes it today.

## 6. Colour tokens (`theme.css`)

| Token (Tailwind name) | Value | Use |
|---|---|---|
| `primary` / `primary-600` | `#0D9488` (teal) | Primary actions, active state, links, focus |
| `primary-50 … 900` | `#F0FDFA` `#CCFBF1` `#99F6E4` `#5EEAD4` `#2DD4BF` `#14B8A6` `#0D9488` `#0F766E` `#115E59` `#134E4A` | Tints, hover, flash |
| `secondary` (+50…900) | `#475569` (slate) | Secondary button |
| `accent` | `#D97706` | Rare highlight |
| `success` (+50, 100, 500, 600) | `#22C55E` (`#F0FDF4` `#DCFCE7` `#22C55E` `#16A34A`) | Success button/toast |
| `warning` | `#F59E0B`, content `#422006`; no shades | Warning; for tints use Tailwind `amber-*` |
| `info` | `#3b82f6` | Info |
| `danger` = `error` (+50, 100, 300, 500, 600, 900) | `#EF4444` (`#fef2f2` `#fee2e2` `#fca5a5` `#EF4444` `#dc2626` `#7f1d1d`) | Delete, errors, required `*` |
| `neutral` | `#1f2937` | daisyUI neutral |
| `base-100` / `200` / `300` | `oklch(100% 0 0)` / `oklch(98% 0 0)` / `oklch(95% 0 0)` | daisyUI surfaces |
| `base-content` | `#1f2937` | daisyUI text |

- Greys are Tailwind v4's default `gray-*` (OKLCH, not the v3 hex). Text: 800 headings, 700 labels/body
  emphasis, 600 table heads and chips, 500 helper, 400 muted and idle icons. Lines: `gray-100` card and row
  rules, `gray-200` inputs, table heads, list containers; `gray-300` outline button, chips.
- `--palette-*` (surface, line, ink, input-edge, accent, warn, req…) and `--dc-*` in `theme.css` serve the
  form skins and the Appraisal Data Correction screen only. Every one has a dark value.
- Dark mode is `[data-theme=dark]` (`@custom-variant dark`), not the OS preference.
- Global `:focus-visible` is a 2px `#3b82f6` outline; text inputs/textarea/select suppress it and draw their own ring.

## 7. Status colours and banners

| State | Dot | Badge | Row |
|---|---|---|---|
| Complete / has file | `bg-green-600` | `tone="green"` (`bg-green-50 text-green-700`) | default |
| Required, missing | `bg-amber-500` | `tone="yellow"` (`bg-amber-50 text-amber-700`) | amber tint + left bar |
| Optional, empty | `bg-gray-300` | `tone="gray"` | default |

Incomplete title row (TitleTable): `bg-[color-mix(in_oklab,var(--color-amber-50)_70%,white)] hover:bg-amber-50`
plus `shadow-[inset_3px_0_0_#f59e0b]` on the first cell. The tint is opaque on purpose (section 10).
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

## 8. Cards and surfaces

| Component | Classes |
|---|---|
| `FormCard` | `bg-white rounded-2xl shadow-sm border border-gray-100`; body `p-5` (`noPadding` to drop); `coloredBorder` adds `border-l-4` |
| `SectionHeader variant="card"` | `px-5 py-4 border-b border-gray-100`; icon tile `w-9 h-9 rounded-xl shadow-sm` + colour pair (`bg-primary/10 text-primary`, `bg-blue-50 text-blue-500`…); subtitle `text-xs text-gray-500` |
| `Card` | `bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden`; header `px-6 py-4`; body `p-6`; footer `bg-gray-50` |
| List-page table box | `bg-white rounded-lg border border-gray-200 overflow-hidden` |
| Row menu / popover | `rounded-lg border border-gray-200 bg-white py-1 shadow-lg`, items `px-3 py-2 text-sm text-gray-700 data-focus:bg-gray-100` |

- New page/section headers use `SectionHeader` / `FormCard`. Do not build a custom header row; save space by
  putting actions in `rightIcon`, not by restyling the title.
- A card whose table runs to its bottom edge drops the bottom radius, top stays round:
  `FormCard className="rounded-b-none!"` with `noPadding` (`TitleInformationForm.tsx`), or a plain
  `section` with `rounded-t-2xl rounded-b-none`. Remove the last table's own bottom border so the card edge is
  the only line (`[&>section:last-of-type>div:last-child]:border-b-0`).

## 9. Controls

**Button** (`shared/components/Button.tsx`): `inline-flex items-center justify-center rounded-md font-medium`,
`type="button"` by default, `disabled:opacity-50`, focus `ring-2 ring-primary/40 ring-offset-2`.

| size | classes | text px |
|---|---|---|
| `xs` | `px-2 py-1 text-xs` | 12 |
| `sm` | `px-3 py-1.5 text-xs` | 12 |
| `md` (default) | `px-4 py-2 text-sm` | 13 |
| `lg` | `px-5 py-2.5 text-base` | 15 |
| `xl` | `px-6 py-3 text-lg` | 16 |

Variants: `primary` (`bg-primary text-white shadow-sm`), `secondary`, `outline` (`border-gray-300 text-gray-700`),
`danger`, `success`, `warning`, `info`, `ghost` (`hover:bg-gray-100 text-gray-700`). Solid variants hover at `/80`.

- Quick-add tinted button: `rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20`.
- Import: `<Button variant="ghost" size="sm" className="text-green-700!" leftIcon={file-excel icon}>`.
- Icon-only row action: `flex size-6 items-center justify-center rounded-md text-gray-400`, hover per action:
  edit `hover:bg-primary/10 hover:text-primary`, duplicate `hover:bg-gray-100 hover:text-gray-700`, delete
  `hover:bg-danger/10 hover:text-danger`. Always `aria-label` + `title`.

**daisyUI** sizes are re-pinned in `@layer daisyui` (`index.css`): `btn`/`input`/`select`/`textarea` md 13,
sm 12, xs 11, lg 15, xl 18; `badge`/`kbd` md 13, sm 12, xs 11, lg 15, xl 16. Prefer the shared components.

**Inputs** (`Input`, `Dropdown`, `Textarea`)

- Editable = **white box with a drawn border**, always: `px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300`.
  A grey fill without a border was tried and rejected (users could not tell what takes input).
- Height at the 14px root: **35.5px** (7 + 19.5 + 7 + 2 border). Keep that height for a control that sits beside inputs.
- Focus: `Input` `ring-2 ring-primary-500/20 border-primary-500`; `Dropdown`/`Textarea` `ring-gray-200 border-gray-400`.
- Error: `border-danger text-danger-900`, message `text-xs text-danger`.
- Disabled, or read-only via `useFormReadOnly()`: `bg-gray-50 text-gray-500 cursor-not-allowed`, border kept.
  Inside the form skins (`.cas-form-grid`) disabled/read-only controls are bare text instead; the editable box
  is `--cas-input` (white) with `--cas-input-edge` (`--palette-input-edge`, `#e0e7e9`), text `--cas-ctl-font`
  0.9286rem (13), height `--cas-input-h` 2.3077rem (`formLayoutSkin.css`).
- `Input dense` / `Dropdown compact` are for dense grid cells and the pagination footer only.

**Toggle** (`inputs/Toggle.tsx`): `md` option `py-[calc(0.25rem+1px)] px-4 text-sm` medium inside a `p-1` track,
so the control is exactly the input height (35.5px). `sm` is `text-xs`. Track `rounded-full bg-gray-100/80`,
sliding pill `bg-primary shadow-md shadow-primary/25`, active label white.

**Badge** (`Badge.tsx`): `inline-flex items-center gap-1.5 font-medium rounded-full`, dot on by default, `badgeStyle="soft"`.
Sizes: `sm` (default) `px-2 py-0.5 text-xs`; `md` `text-sm`; `lg` `text-base`; `xs` `text-[11px]`.
Colour by `tone` (`teal | green | yellow | gray`) or `type`+`value` (status, priority, channel…).
Add `whitespace-nowrap` at the call site in tables; the component does not set it.

**File chip** (`documentCard/DocumentFileChip.tsx`): `inline-flex max-w-[20rem] items-center gap-1 rounded-md border bg-white py-0.5 pr-1 pl-1.5 text-xs`,
selected `border-primary bg-primary/5`. Tile `FileBadgeIcon` sm: `grid place-items-center h-[1.3rem] min-w-[1.3rem]`, IMG `bg-blue-600`,
PDF `bg-red-600`, other `bg-gray-500`. Every child `items-center`; name `truncate` with the full name in `title`.

**SlideOverPanel**: header `px-6 py-4 border-b border-gray-200`, body `px-6 py-4`, optional pinned `footer`;
widths `md lg xl 2xl(70vw) full`. **Pagination**: `border-t bg-gray-50 px-4 py-2 text-sm`, pages are 0-based.

## 10. Tables

**List page** (`RequestListingPage.tsx` is the reference)

```
<table className="w-full text-table">
thead: bg-gray-50 sticky top-0 z-10
th:    text-xs text-left font-semibold text-gray-600 px-4 py-2.5   (sortable: hover:bg-gray-100, active bg-primary/5)
tbody: divide-y divide-gray-100;  tr: hover:bg-gray-50 even:bg-gray-50/50
td:    px-4 py-2.5;  secondary line text-xs text-gray-400;  badges size sm
```

Do not combine daisyUI `table-xs` / `table-sm` with `text-table`: their cell rule beats the table-level class.

**Which size:** `text-table` (12.5) is for list and catalog pages (requests, tasks, monitoring, admin
maintenance) and the request title table. Tables inside a modal or a card keep `text-sm` (13) on purpose:
ProvideDocumentsTaskPage, AppraisalPicker, QuotationDocumentsDialog, PropertyGroupCard, MachinerySummaryTab,
and the appraisal summary/form tables. `th`, secondary lines and badges are 12 in both.

**Form/detail table** (`titles/TitleTable.tsx` is the reference)

- `table-fixed border-separate border-spacing-0 text-table tabular-nums`, `min-w-[..rem]`, column widths in rem
  via `<colgroup>`. Scroll box `max-h-[60vh] overflow-auto border-y border-gray-200`.
- `th`: `sticky top-0 bg-gray-50 border-b border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600`.
  `td`: `border-b border-gray-100 px-2 py-1 align-middle`. A two-line row (12.5 + 12) is 44.8px at 1440.
- Status column: `<Badge size="sm" className="whitespace-nowrap">` (12).
- Stacking, lowest first: body cells, sticky body cells `z-[1]`, sticky `tfoot` `z-[2]`, header `z-10`, header
  corner `z-20`. Each layer sets its own z and background; never rely on class order.
- **Sticky actions column** on the right: `sticky right-0 z-[1] bg-inherit`, **no shadow line**. Every row
  background must be opaque (white, `gray-50`, or the colour-mixed amber), or content shows through.
- **Collapse**: when the card is narrower than the table's full min-width, the icons fold into the ⋮ menu:
  edit / duplicate / delete first, then `<div role="separator" className="my-1 border-t border-gray-100" />`,
  then the other items. Measure the card once (`TitleTableGroup` + `useCardIsWide`, threshold in rem via the
  root font size) so every table in the card collapses together.
- Column sizing follows the **card** width: wrap in `@container` and use `@min-[..rem]:w-[..]` (TitleTable
  type/area), not viewport breakpoints.
- Dense rows: at most 2 lines per row. Cut with `truncate` + `title` (full text on hover) instead of wrapping.
  Chips are one line (`inline-flex max-w-full`, value `min-w-0 truncate`). Badges `whitespace-nowrap`.
- Numbers: right-aligned (`text-right`) with `tabular-nums`; empty value is `<span className="text-gray-400">—</span>`.
- Rows open on click and on Enter (`tabIndex={0}`); inner buttons `stopPropagation`.

## 11. Toolbars, chips and uploads

- Toolbar row: `flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-4|5 py-2.5|3`; search
  is the shared `Input` with a `size-3.5` magnifier `leftIcon`; status/counter text `text-xs text-gray-500`.
- Filter chip: idle `border-gray-200|300 bg-white text-gray-600`; active is either solid
  `border-primary bg-primary font-medium text-white` (TitleToolbar) or tinted
  `border-primary bg-primary/10 font-semibold text-primary` (DocumentToolbar). Match the surface you are on.
- **Uploads** (`DocumentUploader.tsx`, `utils/uploadFiles.ts`): the per-row picker is `multiple`
  (`.pdf,.png,.jpg,.jpeg`). `splitUploadable` drops files of the wrong type or over `MAX_UPLOAD_BYTES` and names
  them all in one `toast.error`; the rest go up through `runLimited`, `UPLOAD_CONCURRENCY` = 3 at a time, and a
  multi-file pick shows one success toast. Reuse these helpers; do not write another upload loop.
- The title drawer's "เอกสารของโฉนดนี้" section is the same document card in scope mode
  (`TitleDocumentsSection`, `scope={{ titleIndex, heading }}`), not a second component.

## 12. Technical styling rules

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

## 13. i18n

- Every visible string, `aria-label`, `title` and `placeholder` goes through `t()`, in `src/i18n/locales/{en,th,zh}/<namespace>.json`.
  The three files keep an identical key set, plural keys (`_one` / `_other`) included. Conventions: `src/i18n/README.md`.
- Reuse `common` keys (`actions.*`, `status.*`); feature keys go in the feature namespace, grouped by surface.
- `src/i18n/__tests__/localeParity.test.ts` only runs in the **full** suite; a path-filtered vitest run skips it.

## 14. Verification checklist for UI changes

1. `npx tsc -b --force` (incremental `-b` is unreliable here).
2. `npx vitest run`, whole suite. Read the `Errors` line too: an unhandled rejection exits 1 with every test green.
3. `npx prettier --write <each changed file>`; never a folder, never with an empty file list (it then formats the repo).
4. Measure computed sizes (font-size, height, padding) in a real browser at 1440 and 1920 widths.
5. Sticky columns: at `scrollLeft = 0`, compare `getBoundingClientRect()` of the last normal cell and the
   sticky cell; nothing may sit under it. Do not reason from `scrollWidth`.
6. Thai text: check that the top marks are whole, especially inside `overflow-hidden` boxes.
7. Screenshots before and after, and look at them.

## 15. Known deviations (do not copy)

- `TitleTable` deed / holder / place columns still use viewport breakpoints (`min-[1400px]`, `min-[1700px]`);
  `DocumentTypeRow` uses `@max-[560px]` and px grid tracks.
- Missing document rows (`DocumentTypeRow`) are `bg-amber-50` with no left bar; title rows have the bar.
- The amber bar is the literal `#f59e0b`, not `var(--color-warning)`.
- px font literals remain: `Badge xs` `text-[11px]`, `FileBadgeIcon lg` `text-[11px]`, `Input dense` `text-[12px]`,
  `TitleNumbersField` `text-[15px]`, and many more in pricingAnalysis/appraisal (follow-up list).
- `Input` focus is a primary ring; `Dropdown`/`Textarea` focus is grey.
- List-page filters are native `<select>`; Pagination uses the shared `Dropdown`.
- Comments in `Button.tsx` and `SectionHeader.tsx` still quote the old 14px / 16px sizes. The classes are
  right; trust the tables above.

## 16. Open decisions (do not decide; ask the user)

- **Left sidebar menu**: A) 14px items, rem width about 256px, truncate + tooltip; B) keep 12px (`text-xs`
  today), rem width, truncate.
- List filter dropdowns vs search input size.
- Whether monitoring/admin catalog tables use `text-table` (applied for now).
- The root step-up to 15px at >= 1920 (kept for now).
