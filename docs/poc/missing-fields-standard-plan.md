# Missing-fields chip as the form standard

Request: the Request page's "ขาด n ช่อง" chip + popover (grouped by section, "ไปที่ช่อง") becomes the standard for every form, replacing the flat `FormErrorAlert` banner at the top of the form.
Branch: `feature/block-condo-redesign` (same branch, uncommitted).

## Today

| Topic | How it works today |
|---|---|
| Banner | Shared `FormProvider` renders `FormErrorAlert` above the form after a failed submit. The title is hard-coded English. Labels are the RHF key in title case ("Selling Area Percent"). |
| Where the banner shows | About 30 pages:<br>• Property ×11<br>• Block project info / tower / model / land / unit price<br>• Data Correction<br>• Market comparable<br>• Supporting data<br>• Machinery tabs<br>• 10 pricing panels<br>• Decision Summary |
| Request page | Has its own live chip:<br>• It runs `schema.safeParse` on a 300 ms debounce over `watch`.<br>• Labels come from its field configs.<br>• Sections are a request-only switch.<br>• The banner is turned off. |

## Design

1. **Shared UI** `shared/components/form/missing/`:
   - Move `MissingFieldsChip` (chip + popover) and the provider here from `features/request`. The chip takes a `summary` of `{ sections: [{ id, title, items: [{ key, label, path }] }], total }`.
   - Add a11y on top of what Request has: focus moves into the popover and back to the chip, plus `aria-controls`.
2. **Generic hook** `useFormMissingFields()`, reading the `schema` that `FormProvider` already receives. Nothing is configured per page.
   - **Live:** it runs `schema.safeParse(getValues())` on a 300 ms debounced `watch` subscription. This is the Request pattern, with no page re-render.
   - **Label:** first the translated label in the DOM (`[data-field=path]`, which is already rendered with the FieldLabels translation), then the config label, then the humanized key. Array rows read "{label} รายการที่ n".
   - **Section:** the `FormSection` the field sits in (`[data-field]` → closest section → its title). A field outside every section goes under "อื่นๆ".
   - **Jump:** a page with tabs registers a `reveal(path)` that switches to the field's tab first; the property header and the Data Correction tabs already have that logic. Then it calls `scrollToField`.
3. **FormProvider:**
   - `FormErrorAlert` is deleted.
   - A failed Save opens the popover instead of showing the banner.
   - `ActionBar.Right` puts the chip first, left of Save Draft, automatically whenever it sits inside a FormProvider.
   - Pricing panels (no bottom bar) put the chip in the top bar next to Save.
4. **Request:** keeps its own hook for its special items (customer/property counts, title rows, required documents) and feeds the shared chip.
5. **DESIGN.md §17:** a "Missing fields" rule. A form never shows an error banner on top; the chip in the action bar is the summary, and field errors stay inline.
6. **i18n:** `common:missing.*` (chip, popoverTitle, goTo, complete, rowField, other section) in th/en/zh.

## Out of scope

- Server 400 `errors` (still a toast).
- Decision Summary workflow completion errors (they stay in the submit dialog, since they carry no field paths).

## Known limit

Zod skips `superRefine` rules while base issues remain, so a conditional "required when X" field appears only after the plain required fields are filled. Request works around this with `buildConditionalRefinement(fields)`. The generic hook takes an optional `fields` prop to do the same; pages that pass their `all*Fields` get it.

## Decisions (user, 2026-10-21)

- **Counting:** live, as on Request. A failed Save opens the popover. Save Draft is unchanged.
- **Scope round 1:** property pages only (the 11 property routes plus the machinery tabs), behind an opt-in `errorSummary="chip"` prop.
- **Scope round 2:** everything else, then the banner and the prop are removed.

## Phases

- [x] 1. Shared chip, provider and hook, plus tests (react-expert) · gates (test-automator)
- [x] 2. FormProvider and ActionBar wiring, banner removed, tab reveal for property, Block and Data Correction
- [x] 3. Request imports the moved chip (refactor only, no behaviour change)
- [x] 4. Block, Data Correction, market comparable, supporting data, Decision Summary, pricing; `FormErrorAlert` stubbed (round 2, 2026-10-21, see notes below)
- [x] 5. DESIGN.md (property + Request scope), then QA: probe property, Block, Data Correction, pricing and Request in light and dark, with non-GET requests aborted
- [ ] 6. QA round 2: tsc, eslint, vitest, then probe Data Correction, market comparable, supporting data, Decision Summary, one pricing panel per family, and a Block page

## Review

(2026-10-21, property round done, nothing committed)

- **Shared code:** `shared/components/form/missing/`:
  - MissingFieldsChip
  - MissingFieldsProvider + missingFieldsContext
  - useFormMissingFields: live safeParse and conditional refinement; labels from the DOM, then config, then the key; items in page order; duplicate labels get the sub-heading as a suffix
  - useJumpToMissing (reveal tab, then scroll and focus)
- **FormProvider:** `errorSummary="chip"` + `fields`. A failed Save opens the popover.
- **ActionBar.Right:** renders the chip, hidden in read-only.
- **scrollToField:** now focuses radio pills.
- **Pages:** 11 property pages + the 2 machinery tabs. Request uses the shared chip and keeps the same behaviour.
- **Gates:** tsc 0, eslint no new findings, vitest 3077 passed / 2 skipped.
- **Browser QA:** every scenario passes, light and dark, at 1024 and 1440 widths.

### Round 2 notes (2026-10-21, not yet run through the gates)

- **Banner removed.** `FormProvider` always runs the missing-fields provider; `errorSummary`, `showErrorAlert` and the banner branch are gone. `FormErrorAlert.tsx` and the unused all-in-one `Form.tsx` are stubbed to `export {};`. `useScrollToFirstError` is deleted (nothing else used it), so no form scrolls on a failed submit; the popover's "go to field" does.
- **New `FormProvider` props:** `renderedOnly` (list only fields the page draws; market comparable uses it) and `missingSummary={false}` (Request only, which runs its own provider and would otherwise parse its huge form twice).
- **Popover opens by hand also re-checks** the form, for a change that is not a form edit (the market comparable price toggle swaps which field is on screen).
- **Data Correction:** the reason joins the schema through `withReason` (`z.intersection`), used by the resolver, `FormProvider` and the chip. The manual `setError('reason')` is gone. `PropertyTabs` registers a reveal in place of its own auto-switch; `PropertyEditorHeader` lost its auto-switch for the same reason. `getFieldConstraints` learned `ZodIntersection` so the required marks survive.
- **Market comparable:** factor fields were named `factorData.[n].value`, which never matched the issue path `factorData.n.value`, so the chip could not label or find them. Renamed to `factorData.n.value` (RHF and the condition evaluator accept both). A row reads without "รายการที่ n" when every row draws a label of its own.
- **Supporting data:** the five blocks became titled `section[id]` so the chip groups by them instead of "อื่นๆ".
- **Decision Summary:** no chip. Its schema has no required field, so a permanent "ครบถ้วน" would be noise.
- **Pricing:** explicit `placement="down"` chip before Save in the top bar of all 10 panels.
  - `MethodTabs` registers a reveal (matches `[data-field]` or the input's `name` inside each hidden tab) and each tab body is a `section[id]` named by its tab button, so items group by tab.
  - `RHFInputCell` puts `data-field`, `data-grid-cell` and, when the cell knows it, `data-field-label` on the control itself (`TDropdown` forwards them to its own outer div). No wrapper, so the grid layout is unchanged.
  - The hook reads a label from `data-field-label`, `aria-label`, `<label>`, then, for a bare grid control, from where it sits: the row's first cell plus the column headers in a `<table>` (rowSpan/colSpan aware), or the label cell of a `data-label-row` row (`KvRow`, `MethodRailField`). `input[name]` is found as a fallback.
  - The period inputs in Profit Rent and Leasehold got a `name` and an `aria-label`; WQS / SAG / DC pass the template popover's two labels as `fields`.
- **QA fixes (2026-10-21):**
  - Template picker (WQS, SAG, DC, DCF): the trigger carries `data-field-aliases` for both its fields and registers a reveal that opens the popover; the reveal registry now holds several functions. DCF also passes its `templateCode` label.
  - A jump that finds nothing falls back to section, form scroller, first form, window top.
  - `missing.popoverTitle` is plural by section count (`_one`/`_other` in en, th and zh; th/zh repeat the same text because parity needs identical keys).
- **Still open:**
  - Inline field error messages are still English ("X is required").
  - Pricing: the hypothesis tabs and the DCF assumption sheets/modals do not go through `RHFInputCell`, so their rare range errors still read as the humanised key.
  - Data Correction: conditional rules in a property schema stay hidden until the plain required fields are filled (the registry holds no `fields` array).
