import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { Tone } from '../utils/labels';

const PILL_CLASSES: Record<Tone, string> = {
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  gray: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300',
};

interface StatusPillProps {
  tone: Tone;
  blink?: boolean;
  children: ReactNode;
}

/** Small rounded status badge with a leading dot, used on both list rows and drawers. */
export function StatusPill({ tone, blink, children }: StatusPillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-[9px] py-[2px] text-[11px] font-semibold whitespace-nowrap',
        PILL_CLASSES[tone],
      )}
    >
      <span
        className={clsx(
          'size-[6px] rounded-full bg-current shrink-0',
          blink && 'motion-safe:animate-pulse',
        )}
      />
      {children}
    </span>
  );
}

const TAG_CLASSES: Record<Tone, string> = {
  red: 'border-red-200 text-red-600 bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:bg-red-500/10',
  amber:
    'border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:bg-amber-500/10',
  sky: 'border-transparent text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
  emerald:
    'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:bg-emerald-500/10',
  gray: 'border-gray-300 text-gray-500 dark:border-white/20 dark:text-gray-400',
};

/** Small outlined label, e.g. "ordered queue" / "needs a data fix" tags on a row. */
export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[11px] font-medium whitespace-nowrap',
        TAG_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}

const CALLOUT_CLASSES: Record<'amber' | 'red' | 'sky', string> = {
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  red: 'bg-red-50 border-red-200 text-red-700',
  sky: 'bg-sky-50 border-sky-200 text-sky-700',
};

/**
 * Notice box for drawer/dialog bodies. Deliberately light-only (no `dark:` classes): every caller
 * renders inside SlideOverPanel/ConfirmDialog, which are hard-coded white surfaces in both themes.
 */
export function Callout({
  tone,
  title,
  children,
}: {
  tone: 'amber' | 'red' | 'sky';
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border px-3 py-2.5 text-[13px] flex flex-col gap-1',
        CALLOUT_CLASSES[tone],
      )}
    >
      <b className="font-semibold">{title}</b>
      {children}
    </div>
  );
}

/**
 * Reference cell: type label + number, linked when a detail route exists.
 * When `number` hasn't resolved but `refId` has, falls back to a short id (full id in `title`)
 * rather than showing "—" for a reference that's actually known.
 */
export function RefCell({
  label,
  number,
  refId,
  href,
}: {
  label?: string;
  number?: string;
  refId?: string;
  href?: string | null;
}) {
  const shortId = !number && refId ? refId.slice(0, 8) : undefined;
  const displayText = number ?? shortId;
  if (!displayText) return <span className="text-gray-400">—</span>;
  const fullIdTitle = shortId ? refId : undefined;
  return (
    <span className="whitespace-nowrap">
      {label && <span className="text-[12px] text-gray-400 mr-1">{label}</span>}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={fullIdTitle}
          onClick={e => e.stopPropagation()}
          className="font-medium text-primary hover:underline"
        >
          {displayText}
        </a>
      ) : (
        <span className="font-mono text-[12px]" title={fullIdTitle}>
          {displayText}
        </span>
      )}
    </span>
  );
}

export function CodeBlock({
  children,
  wrap,
  className,
}: {
  children: ReactNode;
  /** Wrap long lines instead of scrolling — for raw, unformatted text (e.g. a one-line JSON body). */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <pre
      className={clsx(
        'overflow-y-auto text-[12px] font-mono rounded-lg border border-gray-200 bg-gray-50 p-3 max-h-96',
        wrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto whitespace-pre',
        className,
      )}
    >
      {children}
    </pre>
  );
}

/** AMQP/HTTP header table; renders nothing when there are no headers to show. */
export function HeadersTable({ headers }: { headers?: Record<string, string> }) {
  if (!headers || Object.keys(headers).length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-[13px]">
        <tbody>
          {Object.entries(headers).map(([key, value]) => (
            <tr key={key} className="border-b border-gray-100 last:border-b-0">
              <td className="px-2.5 py-1.5 font-mono text-gray-400 whitespace-nowrap">{key}</td>
              <td className="px-2.5 py-1.5 font-mono break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Table header cell shared by both failure tables — pass a className (e.g. `w-9`) for the checkbox
 * column, which otherwise takes the same uppercase label styling harmlessly (no text inside it). */
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={clsx(
        'text-left px-[10px] py-[9px] text-[11px] uppercase tracking-wide text-base-content/60 whitespace-nowrap',
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Small uppercase heading drawers use above each section (overview, history, etc). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2">
      {children}
    </h3>
  );
}

export function KeyValueList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 min-[521px]:grid-cols-[150px_1fr] gap-x-3 gap-y-[7px] text-[13px]">
      {items.map((item, i) => (
        <KeyValueRow key={i} label={item.label} value={item.value} />
      ))}
    </dl>
  );
}

function KeyValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className="m-0 break-words mb-1.5 min-[521px]:mb-0">{value}</dd>
    </>
  );
}

const TIMELINE_DOT_CLASSES: Record<Tone, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  gray: 'bg-gray-300',
};

export interface TimelineItem {
  tone: Tone;
  content: ReactNode;
  time?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[10px_1fr] gap-2.5 text-[13px] items-start">
          <span
            className={clsx(
              'mt-[5px] size-[10px] rounded-full shrink-0',
              TIMELINE_DOT_CLASSES[item.tone],
            )}
          />
          <div>
            <div>{item.content}</div>
            {item.time && <div className="text-[12px] text-gray-400">{item.time}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
