import clsx from 'clsx';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { get, useFormContext, useWatch } from 'react-hook-form';
import type { FormField } from '@/shared/components/form';
import { evaluateConditions } from '@/shared/components/form/conditions';
import { useFormReadOnly } from '@/shared/components/form/context';
import type { TitleTypeCode } from '@/shared/constants/titleTypes';
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

const NUMERIC = new Set(['rai', 'ngan', 'squareWa']);

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
}

/** One dotted blank on the paper, bound to a field config by name. */
function Blank({ field, label, unit, className }: BlankProps) {
  const { register, control, formState } = useFormContext();
  const values = useWatch({ control }) as Record<string, unknown>;
  const readOnly = useFormReadOnly();
  // A long value steps the type down, then fades out at the edge with the full text on hover.
  const value = field ? String(values[field.name] ?? '') : '';
  const size =
    value.length > 28 ? 'text-[11px]' : value.length > 16 ? 'text-[13px]' : 'text-[15px]';
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
  const error = get(formState.errors, field.name);
  const id = `deed-${field.name}`;
  const maxLength = 'maxLength' in field ? field.maxLength : undefined;
  const registered = register(
    field.name,
    NUMERIC.has(field.name)
      ? {
          setValueAs: (v: unknown) =>
            v === '' || v == null ? null : Number(String(v).replace(/,/g, '')),
        }
      : undefined,
  );

  return (
    <div className={clsx('flex min-w-0 items-baseline gap-1.5 text-[13.5px]', className)}>
      {label && (
        <label htmlFor={id} className="whitespace-nowrap">
          {label}
          {required && !readOnly && <span className="ml-px text-danger">*</span>}
        </label>
      )}
      <span
        className={clsx(
          'flex min-w-0 flex-1 items-baseline border-b-[1.5px] transition-colors',
          error
            ? 'border-solid border-danger bg-red-50/60'
            : readOnly
              ? 'border-transparent'
              : 'border-dotted border-[#9AA2A9] hover:bg-blue-50/40 focus-within:border-solid focus-within:border-blue-700 focus-within:bg-blue-50/60',
        )}
      >
        <input
          id={id}
          {...registered}
          ref={element => {
            registered.ref(element);
            inputRef.current = element;
          }}
          title={overflows ? value : undefined}
          inputMode={NUMERIC.has(field.name) ? 'decimal' : undefined}
          // Typing and pasting past the config's limits is refused, not left for the save to reject.
          onBeforeInput={
            NUMERIC.has(field.name)
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
        {unit && (
          <span className="whitespace-nowrap pr-1 text-[12.5px] text-[#8C949C]">{unit}</span>
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
    <div className="flex min-w-0 items-baseline gap-1.5 text-[13.5px] text-[#BCC3C7]">
      <span className="whitespace-nowrap">{label}</span>
      <span className="min-w-0 flex-1 truncate border-b border-dotted border-[#DDE2E0] px-1 text-center text-[15px]">
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
          <span className="absolute right-3 top-2 text-[10px] uppercase tracking-widest text-[#9AA2A9]">
            {t('titleEntry.deed.watermark')}
          </span>
          {children}
        </div>
      </div>
    </article>
  );
}

export interface TitleAddress {
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
}

interface TitleDeedSheetProps {
  fields: FormField[];
  /** The property's title address, where the page has one; blank parts stay skeleton bars. */
  address?: TitleAddress;
}

/**
 * Laid out on the real โฉนดที่ดิน (น.ส.4 จ.): the land's position top left and the deed's number,
 * book and page top right under their own headings, the title and its two lines in the middle,
 * the holder's lines, the area sentence, the map with its scales, and the issue date at the foot,
 * inside a border of fine print. The น.ส.3 family gets its own paper (below); ตราจอง and others keep the
 * โฉนด's bones under their own heading.
 */
export function TitleDeedSheet({ fields, address }: TitleDeedSheetProps) {
  const { t } = useTranslation('appraisal');
  const byName = new Map(fields.map(field => [field.name, field]));
  const f = (name: string) => byName.get(name);

  const values = useWatch() as Record<string, unknown>;
  const titleType = values.titleType as TitleTypeCode | undefined;
  // น.ส.3 and น.ส.3 ข. carry no position fields; the heading stays so the corner still reads right.
  const hasPosition = POSITION_FIELDS.some(name => {
    const field = byName.get(name);
    return field && (!field.showWhen || evaluateConditions(field.showWhen, values, ''));
  });
  const totalSquareWa = Number(values.totalSquareWa) || 0;
  const headingKeys = (titleType && HEADING_KEYS[titleType]) || HEADING_KEYS.OTHER;
  const heading = {
    title: t(headingKeys.title),
    noun: t(headingKeys.noun),
    sub: 'sub' in headingKeys ? t(headingKeys.sub) : undefined,
  };
  const isDeed = titleType === 'DEED';
  const totalText = (
    <span className="text-[12px] text-[#8C949C]">
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
          <div className="text-[28px] font-bold leading-tight underline underline-offset-[6px]">
            {heading.title}
          </div>
          <SkeletonText
            text={t('titleEntry.deed.issuedUnder')}
            className="mt-1 h-3.5 w-2/3 bg-[#DFE4E2]"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
          <div className="grid auto-rows-[2rem] items-end gap-y-1">
            <div className="mb-1 justify-self-center text-[15px] font-bold underline underline-offset-4">
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
            <div className="mb-1 justify-self-center text-[15px] font-bold underline underline-offset-4">
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

        {/* The holder's lines: printed on the paper, not kept by this dialog. */}
        <div aria-hidden="true" className="mt-5 grid gap-1.5">
          <SkeletonText
            text={t('titleEntry.deed.ns3kIssuedFor')}
            className="h-3.5 w-1/2 justify-self-center bg-[#DFE4E2]"
          />
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-x-3">
            <PrintedLine label={t('titleEntry.deed.holderName')} />
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

        <div
          role="group"
          aria-label={ns3k ? t('titleEntry.deed.ns3kAreaLead') : t('titleEntry.deed.ns3AreaLead')}
          className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 text-sm"
        >
          <span>{ns3k ? t('titleEntry.deed.ns3kAreaLead') : t('titleEntry.deed.ns3AreaLead')}</span>
          <Blank field={f('rai')} unit={t('titleEntry.deed.rai')} className="basis-[110px]" />
          <Blank field={f('ngan')} unit={t('titleEntry.deed.ngan')} className="basis-[110px]" />
          <Blank field={f('squareWa')} unit={t('titleEntry.deed.wa')} className="basis-[150px]" />
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
          <div className="text-[15px] font-bold">{t('titleEntry.deed.positionBox')}</div>
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
          <div className="text-[30px] font-bold leading-tight">{heading.title}</div>
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
          <div className="text-[15px] font-bold">{heading.noun}</div>
          <Blank field={f('titleNumber')} label={t('titleEntry.deed.number')} />
          <div className="grid grid-cols-2 gap-x-3">
            <Blank field={f('bookNumber')} label={t('titleEntry.deed.book')} />
            <Blank field={f('pageNumber')} label={t('titleEntry.deed.page')} />
          </div>
          <RecordedLine label={t('titleEntry.deed.district')} value={address?.district} />
          <RecordedLine label={t('titleEntry.deed.province')} value={address?.province} />
        </div>
      </div>

      {/* The holder's lines: printed on the paper, not kept by this dialog. */}
      <div aria-hidden="true" className="mt-5 grid gap-1.5">
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-x-3">
          <PrintedLine label={t('titleEntry.deed.issuedTo')} />
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

      <div
        role="group"
        aria-label={t('titleEntry.deed.areaLead')}
        className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 text-sm"
      >
        <span>{t('titleEntry.deed.areaLead')}</span>
        <Blank field={f('rai')} unit={t('titleEntry.deed.rai')} className="basis-[110px]" />
        <Blank field={f('ngan')} unit={t('titleEntry.deed.ngan')} className="basis-[110px]" />
        <Blank field={f('squareWa')} unit={t('titleEntry.deed.wa')} className="basis-[150px]" />
        {totalText}
      </div>

      <div
        aria-hidden="true"
        className="mt-5 grid grid-cols-3 items-baseline text-[13px] text-[#8C949C]"
      >
        <PrintedLine label={t('titleEntry.deed.mapScaleSheet')} />
        <div className="mx-auto h-3 w-24 rounded bg-[#D3D9D7]">
          <span className="sr-only">{t('titleEntry.deed.map')}</span>
        </div>
        <PrintedLine label={t('titleEntry.deed.mapScale')} />
      </div>
      <div aria-hidden="true" className="relative mt-2 min-h-44 flex-1">
        {/* North arrow, as drawn beside the plot on the paper. */}
        <div className="absolute left-4 top-3 grid justify-items-center text-[11px] font-semibold text-[#6B737B]">
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
