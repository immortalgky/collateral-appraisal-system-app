import clsx from 'clsx';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { get, useFormContext, useWatch } from 'react-hook-form';
import type { FormField } from '@/shared/components/form';
import { evaluateConditions } from '@/shared/components/form/conditions';
import { useFormReadOnly } from '@/shared/components/form/context';
import type { TitleTypeCode } from '@/shared/constants/titleTypes';
import { toSquareWa } from '@/shared/utils/landArea';
import { useTranslation } from 'react-i18next';

/**
 * The land title drawn as the document itself, so each value is keyed in where it sits on the
 * paper: the land's position top left, the title number, book and page top right, the area across
 * the middle. The layout follows the title type the way the paper does.
 *
 * It renders only the fields printed on the title. Visibility and "required" come from the same
 * field configs the plain form uses (showWhen / requiredWhen), and validation from the dialog's
 * schema, so the two views can never disagree about what a title needs.
 */

/** Literal keys: the strictly-typed `t()` rejects a key built from the title type. */
const HEADING_KEYS = {
  DEED: {
    title: 'titleEntry.deed.headings.DEED.title',
    noun: 'titleEntry.deed.headings.DEED.noun',
  },
  NS3K: {
    title: 'titleEntry.deed.headings.NS3K.title',
    sub: 'titleEntry.deed.headings.NS3K.sub',
    noun: 'titleEntry.deed.headings.NS3K.noun',
  },
  NS3: {
    title: 'titleEntry.deed.headings.NS3.title',
    sub: 'titleEntry.deed.headings.NS3.sub',
    noun: 'titleEntry.deed.headings.NS3.noun',
  },
  NS3KO: {
    title: 'titleEntry.deed.headings.NS3KO.title',
    sub: 'titleEntry.deed.headings.NS3KO.sub',
    noun: 'titleEntry.deed.headings.NS3KO.noun',
  },
  POSR: {
    title: 'titleEntry.deed.headings.POSR.title',
    noun: 'titleEntry.deed.headings.POSR.noun',
  },
  OTHER: {
    title: 'titleEntry.deed.headings.OTHER.title',
    noun: 'titleEntry.deed.headings.OTHER.noun',
  },
} as const satisfies Record<TitleTypeCode, { title: string; sub?: string; noun: string }>;

/**
 * Where the title lives in the form, when it is one row of an array (the request page's `titles`).
 * Without it the form IS the title and a field's name is its path (the land page's dialog).
 */
export interface DeedSheetScope {
  name: string;
  index: number;
}

const ScopeContext = createContext<DeedSheetScope | undefined>(undefined);

const scopedPath = (scope: DeedSheetScope | undefined, fieldName: string) =>
  scope ? `${scope.name}.${scope.index}.${fieldName}` : fieldName;

/** The title's own values: the whole form on the land page, the one row on the request page. */
function useTitleValues() {
  const { control } = useFormContext();
  const scope = useContext(ScopeContext);
  return (useWatch({
    control,
    name: scope ? (`${scope.name}.${scope.index}` as never) : undefined,
  }) ?? {}) as Record<string, unknown>;
}

/**
 * Whether a numeric blank may take this text: the same digit, decimal and max limits the shared
 * number input enforces from the config (ngan 1 digit up to 3, wa 2 digits and 2 decimals, …).
 */
function fitsNumber(field: FormField, text: string) {
  const digits = 'maxIntegerDigits' in field ? field.maxIntegerDigits : undefined;
  const decimals = 'decimalPlaces' in field ? field.decimalPlaces : undefined;
  const max = 'max' in field ? field.max : undefined;
  const [int, fraction, ...rest] = text.replace(/,/g, '').split('.');
  if (rest.length || !/^\d*$/.test(int) || (fraction != null && !/^\d*$/.test(fraction)))
    return false;
  if (digits != null && int.length > digits) return false;
  if (fraction != null && (decimals === 0 || (decimals != null && fraction.length > decimals)))
    return false;
  return max == null || !text || Number(text.replace(/,/g, '')) <= max;
}

const POSITION_FIELDS = [
  'rawang',
  'aerialMapName',
  'aerialMapNumber',
  'mapSheetNumber',
  'landParcelNumber',
  'surveyNumber',
];

interface BlankProps {
  field?: FormField;
  label?: string;
  unit?: string;
  className?: string;
  /** An area part: stored as a number, and held to the config's digit, decimal and max limits. */
  numeric?: boolean;
  /**
   * Drawn in place of the input, for a value the page edits somewhere else on the screen (the
   * label, the required mark and the error state stay the paper's). It carries no `data-field`:
   * the editor it points to is what the page scrolls to.
   */
  custom?: ReactNode;
}

/** One dotted blank on the paper, bound to a field config by name. */
function Blank({ field, label, unit, className, numeric, custom }: BlankProps) {
  const { register, formState } = useFormContext();
  const scope = useContext(ScopeContext);
  const values = useTitleValues();
  const readOnly = useFormReadOnly();
  // A long value steps the type down, then fades out at the edge with the full text on hover.
  const value = field ? String(values[field.name] ?? '') : '';
  const size =
    value.length > 28
      ? 'text-[0.7857rem]'
      : value.length > 16
        ? 'text-[0.9286rem]'
        : 'text-[1.0714rem]';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const input = inputRef.current;
    setOverflows(!!input && input.scrollWidth > input.clientWidth + 1);
  }, [value, size]);
  if (!field) return null;

  if (field.showWhen && !evaluateConditions(field.showWhen, values, '')) return null;
  const required =
    field.required ||
    (field.requiredWhen ? evaluateConditions(field.requiredWhen, values, '') : false);
  const path = scopedPath(scope, field.name);
  const error = get(formState.errors, path);
  const id = `deed-${path}`;
  const maxLength = 'maxLength' in field ? field.maxLength : undefined;
  const registered = register(
    path,
    numeric
      ? {
          setValueAs: (v: unknown) =>
            v === '' || v == null ? null : Number(String(v).replace(/,/g, '')),
        }
      : undefined,
  );

  return (
    <div
      // Where scrollToField finds it, as it finds a form field; only inside an array, where the
      // page can name a title's field. On the land page the dialog has no such caller.
      data-field={scope && !custom ? path : undefined}
      className={clsx('flex min-w-0 items-baseline gap-1.5 text-[0.9643rem]', className)}
    >
      {label && (
        <label htmlFor={id} className="whitespace-nowrap">
          {label}
          {required && !readOnly && <span className="ml-px text-danger">*</span>}
        </label>
      )}
      {/* An editable blank is a white box with a drawn border, so it stands out from the printed
          lines and skeleton bars around it; read-only shows just the value. */}
      <span
        className={clsx(
          'flex min-w-0 flex-1 items-baseline rounded-md border px-1 transition-colors',
          readOnly
            ? 'border-transparent'
            : clsx(
                'bg-white focus-within:ring-2',
                error
                  ? 'border-danger bg-red-50 focus-within:border-danger focus-within:ring-danger/20'
                  : required && !value
                    ? 'border-amber-400 hover:border-amber-500 focus-within:border-primary focus-within:ring-primary/20'
                    : 'border-gray-300 hover:border-gray-400 focus-within:border-primary focus-within:ring-primary/20',
              ),
        )}
      >
        {custom ?? (
          <input
            id={id}
            {...registered}
            ref={element => {
              registered.ref(element);
              inputRef.current = element;
            }}
            title={overflows ? value : undefined}
            inputMode={numeric ? 'decimal' : undefined}
            // Typing and pasting past the config's limits is refused, not left for the save to reject.
            onBeforeInput={
              numeric
                ? event => {
                    const input = event.currentTarget;
                    const data = (event.nativeEvent as InputEvent).data ?? '';
                    const next =
                      input.value.slice(0, input.selectionStart ?? input.value.length) +
                      data +
                      input.value.slice(input.selectionEnd ?? input.value.length);
                    if (!fitsNumber(field, next)) event.preventDefault();
                  }
                : undefined
            }
            maxLength={maxLength}
            readOnly={readOnly}
            placeholder={readOnly ? '—' : undefined}
            aria-invalid={error ? true : undefined}
            aria-label={label ? undefined : `${field.label}`}
            className={clsx(
              'w-full min-w-0 border-0 bg-transparent px-1 pb-px pt-0.5 text-center font-semibold text-blue-700 outline-none placeholder:font-normal placeholder:text-slate-300',
              size,
              overflows &&
                'text-ellipsis text-left [mask-image:linear-gradient(to_right,#000_80%,transparent)] focus:[mask-image:none]',
            )}
          />
        )}
        {unit && (
          <span className="whitespace-nowrap pr-1 text-[0.8929rem] text-[#8C949C]">{unit}</span>
        )}
      </span>
    </div>
  );
}

/**
 * Something printed on the paper that this dialog does not keep (the holder, the issue date, the
 * scales): drawn as skeleton bars — a short one for the caption, a long one for its line — so it
 * gives the page its shape without looking like a field to fill in. The caption stays for screen
 * readers only.
 */
const PrintedLine = ({ label, className }: { label: string; className?: string }) => (
  <div className={clsx('flex min-w-0 items-center gap-1.5 py-1', className)}>
    <span className="sr-only">{label}</span>
    <span
      aria-hidden="true"
      className="h-2.5 shrink-0 rounded bg-[#D3D9D7]"
      style={{ width: `${Math.min(Math.max(label.length, 2), 12) * 0.45}rem` }}
    />
    <span aria-hidden="true" className="h-2.5 min-w-6 flex-1 rounded bg-[#DFE4E2]" />
  </div>
);

/** Shown on the paper as it is on the record — the property's title address — never edited here. */
const RecordedLine = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="flex min-w-0 items-baseline gap-1.5 text-[0.9643rem] text-[#BCC3C7]">
      <span className="whitespace-nowrap">{label}</span>
      <span className="min-w-0 flex-1 truncate border-b border-dotted border-[#DDE2E0] px-1 text-center text-[1.0714rem]">
        {value}
      </span>
    </div>
  ) : (
    <PrintedLine label={label} />
  );

/** Printed wording drawn as a skeleton bar; the words stay for screen readers. */
const SkeletonText = ({ text, className }: { text: string; className: string }) => (
  <div className={clsx('rounded', className)}>
    <span className="sr-only">{text}</span>
  </div>
);

const EMBLEM_TONES = {
  red: '#D69BA1',
  green: '#7FBF95',
  grey: '#AEB5BA',
} as const;

/** The right half of the emblem: crown, chest, raised arm, spread wing, folded leg, foot and tail. */
const EMBLEM_HALF = [
  'M50 1 C51 8 53 14 55 21 L50 21 Z',
  'M50 31 L56 31 C61 32 63 36 62 41 C61 47 58 52 56 57 L50 57 Z',
  'M58 33 L66 34 L68 25 L70 21 L73 18 L72.5 22 L75 19.5 L74.5 23.5 L77 23 L72.5 27 L70.5 37 L59 39 Z',
  'M60 42 C70 38 84 24 96 5 Q98 10 96 14 Q99 16 99 19 Q95 23 90 25 Q95 27 95 30 Q90 34 85 35 Q89 38 89 41 Q84 44 78 44 Q81 47 81 50 Q75 52 70 51 Q72 54 71 57 Q65 57 60 54 Z',
  'M50 55 L57 55 C64 57 72 61 76 66 C71 71 62 72 56 72 L50 72 Z',
  'M55 71 L62 71 L67 76 L71 75 L69 79 L66 79 L66 83 L62.5 80 L60 84 L58.5 78 Z',
  'M50 71 L53.5 71 L53 83 L50 88 Z',
].join(' ');

/**
 * A stand-in for the emblem over the top edge, where the paper has it: a garuda shaped roughly like
 * the one printed there (arms raised, wings swept up, seated) as a flat one-colour silhouette with
 * no inner detail. Our own simplified drawing, not a trace of the state emblem. Red on a โฉนด, green
 * on a น.ส.3 ก., grey on a น.ส.3 / น.ส.3 ข.
 */
const Emblem = ({ label, tone }: { label: string; tone: keyof typeof EMBLEM_TONES }) => (
  <svg
    viewBox="0 0 100 92"
    role="img"
    aria-label={label}
    fill={EMBLEM_TONES[tone]}
    className="absolute left-1/2 top-0 h-20 w-[5.5rem] -translate-x-1/2 -translate-y-1/2"
  >
    <path d={EMBLEM_HALF} />
    <path d={EMBLEM_HALF} transform="translate(100 0) scale(-1 1)" />
    <circle cx="50" cy="26" r="6.5" />
  </svg>
);

/**
 * The sheet every title type is drawn on: a band of fine print (tight grey ticks read as microtext at
 * this size) between a black double rule, the emblem over the top edge and the mock watermark.
 */
function Paper({
  label,
  emblem,
  tone,
  children,
}: {
  label: string;
  emblem: string;
  tone: keyof typeof EMBLEM_TONES;
  children: ReactNode;
}) {
  const { t } = useTranslation('appraisal');
  return (
    <article
      aria-label={label}
      className="relative w-full max-w-[780px] rounded-sm bg-white p-2.5 pt-8 text-[#2F3338] shadow-[0_1px_2px_rgba(20,30,40,0.08),0_12px_30px_rgba(20,30,40,0.12)]"
    >
      <div
        className="relative border-2 border-[#2F3338] p-2"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(80,90,100,0.22) 0 1px, transparent 1px 3px), #FFFFFF',
        }}
      >
        {/* Every type is drawn at one height, the tallest (น.ส.3 with its boundary lines), so switching
            type does not change the paper's size; each layout's empty plot space takes up the rest. */}
        <div className="relative flex min-h-[48rem] flex-col border border-[#2F3338] bg-[#EEF2F0] px-7 pb-7 pt-12">
          <Emblem label={emblem} tone={tone} />
          <span className="absolute right-3 top-2 text-[0.7143rem] uppercase tracking-widest text-[#9AA2A9]">
            {t('titleEntry.deed.watermark')}
          </span>
          {children}
        </div>
      </div>
    </article>
  );
}

/**
 * The condominium unit title (อ.ช.2): the land it stands on top left (its title deeds, then the
 * place from the title address), the unit's location top right, the holder's lines, the unit's
 * area, and the rest as printed bars like the land papers.
 */
function CondoPaper({
  f,
  address,
  holder,
  titleNumbers,
}: {
  f: (name: string) => FormField | undefined;
  address?: TitleAddress;
  holder: ReactNode;
  titleNumbers?: ReactNode;
}) {
  const { t } = useTranslation('appraisal');
  return (
    <Paper label={t('titleEntry.deed.condo.title')} emblem={t('titleEntry.deed.emblem')} tone="red">
      <div className="grid justify-items-center gap-1 text-center">
        <div className="text-[2rem] font-bold leading-tight">
          {t('titleEntry.deed.condo.title')}
        </div>
        <div className="text-xs text-[#8C949C]">{t('titleEntry.deed.condo.sub')}</div>
        <SkeletonText
          text={t('titleEntry.deed.issuedUnder')}
          className="mt-1 h-3 w-1/2 bg-[#DFE4E2]"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-x-8 gap-y-4 md:grid-cols-2">
        <div className="grid content-start gap-1.5">
          <div className="text-[1.0714rem] font-bold">{t('titleEntry.deed.positionBox')}</div>
          <Blank
            field={f('titleNumber')}
            label={t('titleEntry.deed.condo.landDeed')}
            custom={titleNumbers}
          />
          <RecordedLine label={t('titleEntry.deed.subDistrict')} value={address?.subDistrict} />
          <RecordedLine label={t('titleEntry.deed.district')} value={address?.district} />
          <RecordedLine label={t('titleEntry.deed.province')} value={address?.province} />
        </div>
        <div className="grid content-start gap-1.5">
          <div className="text-[1.0714rem] font-bold">{t('titleEntry.deed.condo.location')}</div>
          {/* Labelled with the form's own wording (the field configs), so the two never drift. */}
          {[
            'roomNumber',
            'floorNumber',
            'buildingNumber',
            'condoName',
            'condoRegistrationNumber',
          ].map(name => (
            <Blank key={name} field={f(name)} label={f(name)?.label} />
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-1.5">
        {holder}
        <div aria-hidden="true" className="contents">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-x-3">
            <PrintedLine label={t('titleEntry.deed.nationality')} />
            <PrintedLine label={t('titleEntry.deed.houseNo')} />
            <PrintedLine label={t('titleEntry.deed.moo')} className="w-20" />
          </div>
          <div className="grid grid-cols-5 gap-x-3">
            <PrintedLine label={t('titleEntry.deed.road')} />
            <PrintedLine label={t('titleEntry.deed.soi')} />
            <PrintedLine label={t('titleEntry.deed.subDistrict')} />
            <PrintedLine label={t('titleEntry.deed.district')} />
            <PrintedLine label={t('titleEntry.deed.province')} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <Blank
          field={f('usableArea')}
          label={f('usableArea')?.label}
          numeric
          className="w-80 max-w-full"
        />
      </div>

      <div aria-hidden="true" className="mt-5 grid flex-1 content-start gap-3">
        <div className="mx-auto h-3 w-40 rounded bg-[#D3D9D7]">
          <span className="sr-only">{t('titleEntry.deed.map')}</span>
        </div>
        <div className="mx-auto h-40 w-3/4 rounded border border-dashed border-[#C6CDD0]" />
        <div className="grid grid-cols-3 gap-x-4">
          <PrintedLine label={t('titleEntry.deed.mapScaleSheet')} />
          <PrintedLine label={t('titleEntry.deed.mapScale')} />
          <PrintedLine label={t('titleEntry.deed.issuedOn')} />
        </div>
      </div>
    </Paper>
  );
}

export interface TitleAddress {
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
}

/** Config names of the three area blanks, where a page names them differently from the land page. */
export interface DeedAreaNames {
  rai: string;
  ngan: string;
  squareWa: string;
}

const LAND_AREA_NAMES: DeedAreaNames = { rai: 'rai', ngan: 'ngan', squareWa: 'squareWa' };

interface TitleDeedSheetProps {
  fields: FormField[];
  /** The property's title address, where the page has one; blank parts stay skeleton bars. */
  address?: TitleAddress;
  /** Set when the title is one row of an array in the page's form; see {@link DeedSheetScope}. */
  scope?: DeedSheetScope;
  /** The area blanks' config names; defaults to the land page's `rai` / `ngan` / `squareWa`. */
  areaNames?: DeedAreaNames;
  /**
   * The holder's field, for a page that keeps it. The paper then has a real blank where the holder is
   * written; without it (the land page) the line is drawn as a printed bar, since that page does not
   * keep the holder.
   */
  holderField?: FormField;
  /**
   * Draws the paper of a condominium unit (อ.ช.2) instead of a land title's. The fields passed are
   * the condominium's; the land page never sets this.
   */
  variant?: 'condo';
  /**
   * A condominium's land title numbers are a list kept in one string and edited in a box under the
   * paper: this is what the paper shows in its place (a one-line summary that leads there).
   */
  landTitleNumbers?: ReactNode;
}

/**
 * Laid out on the real โฉนดที่ดิน (น.ส.4 จ.): the land's position top left and the deed's number,
 * book and page top right under their own headings, the title and its two lines in the middle,
 * the holder's lines, the area sentence, the map with its scales, and the issue date at the foot,
 * inside a border of fine print. The น.ส.3 family gets its own paper (below); ตราจอง and others keep the
 * โฉนด's bones under their own heading.
 */
export function TitleDeedSheet({ scope, ...props }: TitleDeedSheetProps) {
  return (
    <ScopeContext.Provider value={scope}>
      <DeedSheetBody {...props} />
    </ScopeContext.Provider>
  );
}

function DeedSheetBody({
  fields,
  address,
  areaNames = LAND_AREA_NAMES,
  holderField,
  variant,
  landTitleNumbers,
}: Omit<TitleDeedSheetProps, 'scope'>) {
  const { t } = useTranslation('appraisal');
  const byName = new Map(fields.map(field => [field.name, field]));
  const f = (name: string) => byName.get(name);

  const values = useTitleValues();
  const titleType = values.titleType as TitleTypeCode | undefined;
  // น.ส.3 and น.ส.3 ข. carry no position fields; the heading stays so the corner still reads right.
  const hasPosition = POSITION_FIELDS.some(name => {
    const field = byName.get(name);
    return field && (!field.showWhen || evaluateConditions(field.showWhen, values, ''));
  });
  // Always from the three parts: a page need not keep a total, and a stored one can be stale.
  const totalSquareWa = toSquareWa(
    values[areaNames.rai],
    values[areaNames.ngan],
    values[areaNames.squareWa],
  );
  const holder = holderField ? (
    <Blank
      field={holderField}
      label={
        titleType === 'NS3K' || titleType === 'NS3' || titleType === 'NS3KO'
          ? t('titleEntry.deed.holderName')
          : t('titleEntry.deed.issuedTo')
      }
    />
  ) : null;
  const headingKeys = (titleType && HEADING_KEYS[titleType]) || HEADING_KEYS.OTHER;
  const heading = {
    title: t(headingKeys.title),
    noun: t(headingKeys.noun),
    sub: 'sub' in headingKeys ? t(headingKeys.sub) : undefined,
  };
  const isDeed = titleType === 'DEED';
  const totalText = (
    <span className="text-[0.8571rem] text-[#8C949C]">
      ({t('titleEntry.deed.total')}{' '}
      <b className="tabular-nums text-[#3A3F47]">
        {totalSquareWa.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </b>{' '}
      {t('titleEntry.deed.waShort')})
    </span>
  );

  if (variant === 'condo') {
    return <CondoPaper f={f} address={address} holder={holder} titleNumbers={landTitleNumbers} />;
  }

  // The หนังสือรับรองการทำประโยชน์ papers: a black rule, two underlined columns and the holder's lines.
  // น.ส.3 ก. (green emblem) places the land by aerial map and parcel number; น.ส.3 and น.ส.3 ข. only
  // by where it lies, then list its boundaries before the area.
  if (titleType === 'NS3K' || titleType === 'NS3' || titleType === 'NS3KO') {
    const ns3k = titleType === 'NS3K';
    return (
      <Paper
        label={heading.title}
        emblem={t('titleEntry.deed.emblem')}
        tone={ns3k ? 'green' : 'grey'}
      >
        <div className="grid justify-items-center gap-1.5 text-center">
          <div className="text-[2rem] font-bold leading-tight underline underline-offset-[6px]">
            {heading.title}
          </div>
          <SkeletonText
            text={t('titleEntry.deed.issuedUnder')}
            className="mt-1 h-3.5 w-2/3 bg-[#DFE4E2]"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
          <div className="grid auto-rows-[2rem] items-end gap-y-1">
            <div className="mb-1 justify-self-center text-[1.0714rem] font-bold underline underline-offset-4">
              {ns3k ? t('titleEntry.deed.positionBox') : t('titleEntry.deed.landLocated')}
            </div>
            {ns3k ? (
              <RecordedLine label={t('titleEntry.deed.subDistrict')} value={address?.subDistrict} />
            ) : (
              <div className="grid grid-cols-[1fr_2fr] gap-x-3">
                <PrintedLine label={t('titleEntry.deed.moo')} />
                <RecordedLine
                  label={t('titleEntry.deed.subDistrict')}
                  value={address?.subDistrict}
                />
              </div>
            )}
            <RecordedLine label={t('titleEntry.deed.district')} value={address?.district} />
            <RecordedLine label={t('titleEntry.deed.province')} value={address?.province} />
            {ns3k && (
              <Blank field={f('aerialMapName')} label={t('titleEntry.deed.aerialMapName')} />
            )}
          </div>
          <div className="grid auto-rows-[2rem] items-end gap-y-1">
            <div className="mb-1 justify-self-center text-[1.0714rem] font-bold underline underline-offset-4">
              {t('titleEntry.deed.registry')}
            </div>
            {!ns3k && (
              <>
                <Blank field={f('bookNumber')} label={t('titleEntry.deed.book')} />
                <Blank field={f('pageNumber')} label={t('titleEntry.deed.page')} />
              </>
            )}
            <Blank field={f('titleNumber')} label={t('titleEntry.deed.number')} />
            {ns3k && (
              <>
                <div className="grid grid-cols-[1.4fr_1fr] gap-x-3">
                  <Blank field={f('bookNumber')} label={t('titleEntry.deed.book')} />
                  <Blank field={f('pageNumber')} label={t('titleEntry.deed.page')} />
                </div>
                <Blank field={f('landParcelNumber')} label={t('titleEntry.deed.landParcel')} />
                <div className="grid grid-cols-[1.4fr_1fr] gap-x-3">
                  <Blank
                    field={f('aerialMapNumber')}
                    label={t('titleEntry.deed.aerialMapNumber')}
                  />
                  <Blank field={f('mapSheetNumber')} label={t('titleEntry.deed.mapSheet')} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* The holder's lines: printed on the paper. Where the page keeps the holder, the name is a
            blank to fill in; everything else stays a printed bar. `contents` lets each printed run
            hide from screen readers without becoming a box of its own in the grid. */}
        <div className="mt-5 grid gap-1.5">
          <div aria-hidden="true" className="contents">
            <SkeletonText
              text={t('titleEntry.deed.ns3kIssuedFor')}
              className="h-3.5 w-1/2 justify-self-center bg-[#DFE4E2]"
            />
          </div>
          {holder}
          <div aria-hidden="true" className="contents">
            <div
              className={clsx('grid gap-x-3', holder ? 'grid-cols-2' : 'grid-cols-[2fr_1fr_1fr]')}
            >
              {!holder && <PrintedLine label={t('titleEntry.deed.holderName')} />}
              <PrintedLine label={t('titleEntry.deed.nationality')} />
              <PrintedLine label={t('titleEntry.deed.houseNo')} />
            </div>
            <div className="grid grid-cols-4 gap-x-3">
              <PrintedLine label={t('titleEntry.deed.moo')} />
              <PrintedLine label={t('titleEntry.deed.subDistrict')} />
              <PrintedLine label={t('titleEntry.deed.district')} />
              <PrintedLine label={t('titleEntry.deed.province')} />
            </div>
            <SkeletonText
              text={ns3k ? t('titleEntry.deed.ns3kPossessed') : t('titleEntry.deed.ns3Possessed')}
              className="h-3.5 w-1/2 bg-[#DFE4E2]"
            />
            {!ns3k && (
              <div className="grid gap-1.5 pl-[15%]">
                <PrintedLine label={t('titleEntry.deed.north')} />
                <PrintedLine label={t('titleEntry.deed.south')} />
                <PrintedLine label={t('titleEntry.deed.east')} />
                <PrintedLine label={t('titleEntry.deed.west')} />
              </div>
            )}
          </div>
        </div>

        <div
          role="group"
          aria-label={ns3k ? t('titleEntry.deed.ns3kAreaLead') : t('titleEntry.deed.ns3AreaLead')}
          className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 text-sm"
        >
          <span>{ns3k ? t('titleEntry.deed.ns3kAreaLead') : t('titleEntry.deed.ns3AreaLead')}</span>
          <Blank
            field={f(areaNames.rai)}
            numeric
            unit={t('titleEntry.deed.rai')}
            className="basis-[110px]"
          />
          <Blank
            field={f(areaNames.ngan)}
            numeric
            unit={t('titleEntry.deed.ngan')}
            className="basis-[110px]"
          />
          <Blank
            field={f(areaNames.squareWa)}
            numeric
            unit={t('titleEntry.deed.wa')}
            className="basis-[150px]"
          />
          {totalText}
        </div>

        <div aria-hidden="true" className="mt-5 grid flex-1 content-start gap-3">
          <SkeletonText
            text={ns3k ? t('titleEntry.deed.ns3kMap') : t('titleEntry.deed.ns3Map')}
            className="h-3.5 w-40 justify-self-center bg-[#D3D9D7]"
          />
          {ns3k && (
            <div className="grid grid-cols-2 gap-x-16">
              <PrintedLine label={t('titleEntry.deed.mapScaleAerial')} />
              <PrintedLine label={t('titleEntry.deed.mapScale')} />
            </div>
          )}
          <div className="h-40" />
        </div>
      </Paper>
    );
  }

  return (
    <Paper label={heading.title} emblem={t('titleEntry.deed.emblem')} tone="red">
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-4 md:grid-cols-[1fr_minmax(0,1.25fr)_1fr]">
        <div className="grid content-start gap-1.5">
          <div className="text-[1.0714rem] font-bold">{t('titleEntry.deed.positionBox')}</div>
          {hasPosition && (
            <>
              <Blank field={f('rawang')} label={t('titleEntry.deed.rawang')} />
              <Blank field={f('aerialMapName')} label={t('titleEntry.deed.aerialMapName')} />
              <Blank field={f('aerialMapNumber')} label={t('titleEntry.deed.aerialMapNumber')} />
              <Blank field={f('mapSheetNumber')} label={t('titleEntry.deed.mapSheet')} />
              <Blank field={f('landParcelNumber')} label={t('titleEntry.deed.landParcel')} />
              <Blank field={f('surveyNumber')} label={t('titleEntry.deed.survey')} />
            </>
          )}
          <RecordedLine label={t('titleEntry.deed.subDistrict')} value={address?.subDistrict} />
        </div>

        <div className="order-first grid justify-items-center gap-1 pt-4 text-center md:order-none">
          <div className="text-[2.1429rem] font-bold leading-tight">{heading.title}</div>
          {heading.sub && <div className="text-xs text-[#8C949C]">{heading.sub}</div>}
          {isDeed && (
            <>
              {/* Printed wording, not data: skeleton bars with the words kept for screen readers. */}
              <div className="mt-1 h-3.5 w-11/12 rounded bg-[#D3D9D7]">
                <span className="sr-only">{t('titleEntry.deed.docSubtitle')}</span>
              </div>
              <div className="mt-1 h-2.5 w-3/4 rounded bg-[#DFE4E2]">
                <span className="sr-only">{t('titleEntry.deed.issuedUnder')}</span>
              </div>
            </>
          )}
        </div>

        <div className="grid content-start gap-1.5">
          <div className="text-[1.0714rem] font-bold">{heading.noun}</div>
          <Blank field={f('titleNumber')} label={t('titleEntry.deed.number')} />
          <div className="grid grid-cols-2 gap-x-3">
            <Blank field={f('bookNumber')} label={t('titleEntry.deed.book')} />
            <Blank field={f('pageNumber')} label={t('titleEntry.deed.page')} />
          </div>
          <RecordedLine label={t('titleEntry.deed.district')} value={address?.district} />
          <RecordedLine label={t('titleEntry.deed.province')} value={address?.province} />
        </div>
      </div>

      {/* The holder's lines: printed on the paper. Where the page keeps the holder, the name is a
          blank to fill in; the rest stays a printed bar. */}
      <div className="mt-5 grid gap-1.5">
        {holder}
        <div aria-hidden="true" className="contents">
          <div
            className={clsx(
              'grid gap-x-3',
              holder ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[2fr_1fr_1fr_auto]',
            )}
          >
            {!holder && <PrintedLine label={t('titleEntry.deed.issuedTo')} />}
            <PrintedLine label={t('titleEntry.deed.nationality')} />
            <PrintedLine label={t('titleEntry.deed.houseNo')} />
            <PrintedLine label={t('titleEntry.deed.moo')} className="w-20" />
          </div>
          <div className="grid grid-cols-5 gap-x-3">
            <PrintedLine label={t('titleEntry.deed.road')} />
            <PrintedLine label={t('titleEntry.deed.soi')} />
            <PrintedLine label={t('titleEntry.deed.subDistrict')} />
            <PrintedLine label={t('titleEntry.deed.district')} />
            <PrintedLine label={t('titleEntry.deed.province')} />
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label={t('titleEntry.deed.areaLead')}
        className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 text-sm"
      >
        <span>{t('titleEntry.deed.areaLead')}</span>
        <Blank
          field={f(areaNames.rai)}
          numeric
          unit={t('titleEntry.deed.rai')}
          className="basis-[110px]"
        />
        <Blank
          field={f(areaNames.ngan)}
          numeric
          unit={t('titleEntry.deed.ngan')}
          className="basis-[110px]"
        />
        <Blank
          field={f(areaNames.squareWa)}
          numeric
          unit={t('titleEntry.deed.wa')}
          className="basis-[150px]"
        />
        {totalText}
      </div>

      <div
        aria-hidden="true"
        className="mt-5 grid grid-cols-3 items-baseline text-[0.9286rem] text-[#8C949C]"
      >
        <PrintedLine label={t('titleEntry.deed.mapScaleSheet')} />
        <div className="mx-auto h-3 w-24 rounded bg-[#D3D9D7]">
          <span className="sr-only">{t('titleEntry.deed.map')}</span>
        </div>
        <PrintedLine label={t('titleEntry.deed.mapScale')} />
      </div>
      <div aria-hidden="true" className="relative mt-2 min-h-44 flex-1">
        {/* North arrow, as drawn beside the plot on the paper. */}
        <div className="absolute left-4 top-3 grid justify-items-center text-[0.7857rem] font-semibold text-[#6B737B]">
          N
          <span className="h-14 w-px bg-[#6B737B]" />
        </div>
      </div>

      <div aria-hidden="true" className="relative mt-2 grid grid-cols-[1fr_1fr_1fr] gap-x-4">
        <PrintedLine label={t('titleEntry.deed.issuedOn')} />
        <PrintedLine label={t('titleEntry.deed.month')} />
        <PrintedLine label={t('titleEntry.deed.year')} />
      </div>
    </Paper>
  );
}

/** Fields on the paper. The dialog shows everything else beside it. */
export const DEED_SHEET_FIELDS = new Set([
  'titleType',
  'titleNumber',
  'bookNumber',
  'pageNumber',
  'rawang',
  'landParcelNumber',
  'surveyNumber',
  'mapSheetNumber',
  'aerialMapName',
  'aerialMapNumber',
  'rai',
  'ngan',
  'squareWa',
  'totalSquareWa',
]);
