# i18n Conventions (frontend)

How to internationalize a feature. Languages: **en** (source), **th** (production Thai), **zh** (Chinese — real translation preferred, English-value stub acceptable as long as keys match).

## Adding a namespace

1. Create `src/i18n/locales/{en,th,zh}/<namespace>.json`. **All three files must have an identical key set** (parity is enforced).
2. Register in `src/i18n/index.ts` — three import lines + three `resources` entries, exactly like the existing namespaces (`reappraisal`, `taskMonitor`, `committee`, `notification`, …). `src/i18n/types.ts` picks up the new namespace automatically from `resources['en']`.
3. Group keys by surface: `page`, `list`, `detail`, `columns`, `filters`, `forms`, `fields`, `toasts`, `validation`, `aria`, `empty`, `errors`, etc.

## Using translations in components

```ts
const { t } = useTranslation('myFeature');                 // single namespace
const { t, i18n } = useTranslation(['myFeature', 'common']); // + shared keys via t('common:...')
```

- **Toasts**: `toast.success(t('toasts.saved'))` — the established convention (no wrapper). In **hooks**, call `useTranslation`. In **non-component module functions**, import the instance: `import i18n from '@/i18n'` then `i18n.getFixedT(null, 'myFeature')` or `i18n.t('myFeature:key')`.
- **Dates**: reuse `formatLocaleDate(value, i18n.language)` / `formatLocaleDateTime` from `@/shared/utils/dateUtils` (Intl-based, locale-aware). Only swap in where a hardcoded English date format string exists; don't rip out working `date-fns` calls.
- **Interpolation**: `t('panel.count', { count })` / `t('aria.edit', { name })`. To avoid i18next plural machinery for compact strings like "5m ago", use a non-`count` var name (e.g. `{{n}}`).
- **Validation (Zod)**: convert top-level schemas to a factory and resolve per-render:
  ```ts
  const makeSchema = (t: TFunction<'myFeature'>) =>
    z.object({ name: z.string().min(1, t('validation.nameRequired')) });
  type FormValues = z.infer<ReturnType<typeof makeSchema>>;
  // in component: useForm({ resolver: zodResolver(makeSchema(t)) })
  ```
- **Typed-`t` dynamic keys**: the dynamic segment must be a **finite union**, not `string`. Type lookup maps accordingly, e.g. `Record<Code, 'onTrack' | 'atRisk'>` so `` t(`sla.${key}`) `` type-checks.

## Hidden-literal hotspots (where strings hide)

- **Module-level const arrays** — `const COLUMNS = [{ label: 'Name' }]`, `SLA_OPTIONS`, status maps. Move them **inside** the component and build labels with `t`.
- **Table headers** — `<th className="...">Floor</th>`. (A scan that excludes `className` lines misses these.)
- **Sub-components defined in the same file** that lack their own `useTranslation` hook — add one to each.
- **Attribute strings** — `aria-label`, `placeholder`, `title`.
- **`<option>` text**, `confirm()` / `alert()` strings, empty/error states, loading text.
- **API/mutation hooks** — toasts in `onSuccess`/`onError` outside the component.

## Reuse existing `common` keys (do NOT add new ones)

`actions.{save,cancel,delete,edit,create,confirm,close,back,next,retry,search,submit,reset,add,remove,upload,download,export,import,print,refresh,viewDetails,apply,clear,clearAll}` · `status.{loading,saving,noData,error,errorOccurred,failedToLoad,success,active,inactive,pending,completed,draft}` · `confirm.{deleteTitle,deleteMessage,unsavedChanges}` · `validation.{required,invalidEmail,invalidNumber}` · `select.placeholder` · `range.{from,to}`.

If you need a shared-ish key not in this list, put it in **your** namespace rather than editing `common.json`.

## Leave raw

Backend-supplied enum/code values that aren't a fixed UI label set (e.g. role codes, dynamic statuses) — render as-is, like `reappraisal` leaves its data-driven review-type fallback.

## Verify

- `pnpm exec eslint --fix <changed files>` — clean.
- No remaining hardcoded UI literals (grep text nodes + `aria-label=`/`placeholder=`/`label:` const literals).
- en / th / zh key sets identical.
- `pnpm exec tsc -b` is **not** a clean gate (450+ pre-existing errors) — filter to your touched files.
