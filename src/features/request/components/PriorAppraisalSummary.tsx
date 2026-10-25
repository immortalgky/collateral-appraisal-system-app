import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useWatch } from 'react-hook-form';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  inProgressByCollateralOptions,
  lookupCollateralMasterOptions,
} from '@/features/collateralMaster/api/hooks';
import type { CollateralLookupParams } from '@/features/collateralMaster/api/types';
import Badge from '@/shared/components/Badge';
import { useFormReadOnly } from '@/shared/components/form/context';
import Icon from '@/shared/components/Icon';
import { scrollToField } from '@/shared/components/form/utils';
import { formatDate } from '@/shared/utils/dateUtils';
import type { RequestTitleDtoType } from '../schemas/form';
import { useTitleEditorOpen } from '../store/titleEditorStore';
import { identityOf, lookupParamsOf, priorAppraisalOf } from './titles/usePriorAppraisalCheck';

/** One appraisal (report) that some of the attached titles are in. */
interface Item {
  id: string;
  number: string | null;
  /** Prior appraisals only */
  date?: string | null;
  /** In-progress appraisals only */
  status?: string;
}

/** The titles of each appraisal, in the order the appraisals are first met. */
function groupByAppraisal(
  checked: { identity: string; key: string }[],
  itemsByKey: Map<string, Item[]>,
) {
  const groups = new Map<string, { item: Item; titles: string[] }>();
  for (const { identity, key } of checked)
    for (const item of itemsByKey.get(key) ?? []) {
      const group = groups.get(item.id) ?? { item, titles: [] };
      group.titles.push(identity);
      groups.set(item.id, group);
    }
  return [...groups.values()];
}

/** The frame both cards share; `tone` only picks the colours. */
function Card({
  tone,
  icon,
  heading,
  hint,
  children,
}: {
  tone: 'red' | 'amber';
  icon: string;
  heading: string;
  hint: ReactNode;
  children: ReactNode;
}) {
  const red = tone === 'red';
  return (
    <div
      role="status"
      className={clsx(
        'm-3 rounded-lg border px-3 py-2 text-(--palette-ink)',
        red
          ? 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10'
          : 'border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <Icon
          name={icon}
          style="solid"
          className={clsx('shrink-0', red ? 'text-red-500' : 'text-amber-500')}
        />
        <span
          className={clsx(
            'font-semibold',
            red ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300',
          )}
        >
          {heading}
        </span>
      </div>
      <p className="m-0 mt-0.5 text-xs text-(--palette-gray-600)">{hint}</p>
      <ul
        className={clsx(
          'm-0 mt-2 grid list-none gap-2 border-t p-0 pt-2',
          red ? 'border-(--palette-req-line)' : 'border-amber-200 dark:border-amber-500/30',
        )}
      >
        {children}
      </ul>
    </div>
  );
}

/** White pill with a ring: the soft tint alone vanishes on a tinted card. */
function Pill({ tone, children }: { tone: 'green' | 'yellow' | 'red'; children: ReactNode }) {
  return (
    <Badge
      tone={tone}
      size="sm"
      dot={false}
      rounded
      className={clsx(
        'bg-(--palette-surface)! ring-1 ring-inset',
        tone === 'green' && 'ring-green-300 dark:ring-green-500/40',
        tone === 'yellow' && 'ring-amber-300 dark:ring-amber-500/40',
        tone === 'red' && 'ring-red-300 dark:ring-red-500/40 text-(--palette-req)!',
      )}
    >
      {children}
    </Badge>
  );
}

/**
 * What the collateral master and the open appraisals know about the attached titles, as up to two
 * cards at the top of the title section:
 *  - red: titles being appraised right now in another report (warns, never blocks);
 *  - amber: titles appraised before, grouped by the report each was last in, so the user can pick
 *    that report as the request's prior appraisal instead of starting a new one.
 * Both share the title drawer's lookups (and cache). Informational only: they fail open and show
 * nothing for a title with an incomplete key, a miss, an error or an answer still pending, nor on a
 * submitted or read-only request. The amber card is also left out where the prior is locked (an
 * Initiate draft): nothing there can be picked. Report numbers are plain text. No value is shown:
 * values belong to a whole appraisal.
 */
export default function PriorAppraisalSummary() {
  const { t } = useTranslation('request');
  const readOnly = useFormReadOnly();
  const submitted = !!useWatch({ name: 'meta.isSubmitted' });
  const priorLocked = !!useWatch({ name: 'meta.priorLocked' });
  const live: RequestTitleDtoType[] | undefined = useWatch({ name: 'titles' });
  const prevId: string | undefined = useWatch({ name: 'detail.prevAppraisalId' });
  const active = !submitted && !readOnly;

  // What the cards depend on, as a string: the lookup key and the identity text of every title with
  // a complete key. useWatch can hand back the form's live array, so nothing here caches by its
  // identity; an edit shows up as a different string.
  const editorOpen = useTitleEditorOpen();
  // Titles are edited only in the drawer: while it is open nothing is built (it would be thrown
  // away: what Cancel would revert must not show or be asked about); as it closes, take the live
  // titles.
  const signature = editorOpen
    ? null
    : JSON.stringify(
        active
          ? (live ?? []).flatMap(title => {
              const params = lookupParamsOf(title);
              return params
                ? [{ key: JSON.stringify(params), identity: identityOf(title, t) }]
                : [];
            })
          : [],
      );
  const [committed, setCommitted] = useState(signature ?? '[]');
  useEffect(() => {
    if (signature !== null) setCommitted(signature);
  }, [signature]);

  // Titles with a complete key, and one query of each kind per distinct key
  const checked = useMemo(
    () =>
      (JSON.parse(active ? committed : '[]') as { key: string; identity: string }[]).map(c => ({
        ...c,
        params: JSON.parse(c.key) as CollateralLookupParams,
      })),
    [active, committed],
  );
  const distinct = useMemo(
    () => [...new Map(checked.map(c => [c.key, c.params])).entries()],
    [checked],
  );
  // The collateral master answers only the amber card: not asked where there is no prior to pick.
  // A disabled query still returns what is cached for its key, so the data is gated below as well.
  const lookups = useQueries({
    queries: distinct.map(([, params]) => ({
      ...lookupCollateralMasterOptions(params),
      enabled: !priorLocked,
    })),
  });
  const openOnes = useQueries({
    queries: distinct.map(([, params]) => inProgressByCollateralOptions(params)),
  });

  if (!active) return null;

  // Pending or failed answers have no data: no match (yet)
  const priorByKey = new Map<string, Item[]>(
    distinct.map(([key], i) => {
      const prior = !priorLocked && lookups[i].data ? priorAppraisalOf(lookups[i].data) : null;
      return [key, prior ? [{ id: prior.id, number: prior.number, date: prior.date }] : []];
    }),
  );
  const openByKey = new Map<string, Item[]>(
    distinct.map(([key], i) => [
      key,
      (openOnes[i].data ?? []).map(a => ({
        id: a.appraisalId,
        number: a.appraisalNumber,
        status: a.status,
      })),
    ]),
  );
  const prior = groupByAppraisal(checked, priorByKey);
  const open = groupByAppraisal(checked, openByKey);
  const countMatched = (byKey: Map<string, Item[]>) =>
    checked.filter(c => byKey.get(c.key)?.length).length;
  const total = checked.length;

  // A purpose that does not use a prior appraisal hides its field: go to the purpose instead
  const goToPrior = () =>
    scrollToField(
      document.querySelector('[data-field="detail.prevAppraisalReportNo"]')
        ? 'detail.prevAppraisalReportNo'
        : 'purpose',
    );
  const identities = (items: string[]) => (
    <ul className="m-0 list-none p-0 text-xs text-(--palette-gray-600)">
      {items.map((identity, i) => (
        <li key={i}>{identity}</li>
      ))}
    </ul>
  );
  const report = (number: string | null) => (
    <strong className="text-sm font-semibold text-(--palette-ink)">
      {number
        ? t('requestForm.priorSummary.report', { number })
        : t('requestForm.priorSummary.noReportNumber')}
    </strong>
  );

  return (
    <>
      {open.length > 0 && (
        <Card
          tone="red"
          icon="triangle-exclamation"
          heading={t('requestForm.priorSummary.inProgressHeading', {
            matched: countMatched(openByKey),
            total,
          })}
          hint={t('requestForm.priorSummary.inProgressHint')}
        >
          {open.map(({ item, titles: items }) => (
            <li key={item.id} className="grid gap-0.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {report(item.number)}
                {/* A status without a translation shows as the backend sent it */}
                <Pill tone="red">
                  {t(`requestForm.priorSummary.status.${item.status ?? ''}`, {
                    defaultValue: item.status ?? '',
                  })}
                </Pill>
              </div>
              {identities(items)}
            </li>
          ))}
        </Card>
      )}
      {prior.length > 0 && (
        <Card
          tone="amber"
          icon="circle-info"
          heading={t('requestForm.priorSummary.heading', {
            matched: countMatched(priorByKey),
            total,
          })}
          hint={
            <>
              {t('requestForm.priorSummary.hint')}{' '}
              <button
                type="button"
                onClick={goToPrior}
                className="font-medium text-(--palette-primary-text) hover:underline"
              >
                {t('requestForm.priorSummary.goToPrior')}
              </button>
            </>
          }
        >
          {prior.map(({ item, titles: items }) => (
            <li key={item.id} className="grid gap-0.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {report(item.number)}
                {item.date && (
                  <span className="text-xs text-(--palette-gray-600)">
                    {t('requestForm.priorSummary.date', {
                      date: formatDate(item.date, 'dd/MM/yyyy'),
                    })}
                  </span>
                )}
                {/* No badge until a prior is chosen */}
                {prevId && (
                  <Pill tone={item.id === prevId ? 'green' : 'yellow'}>
                    {t(
                      item.id === prevId
                        ? 'requestForm.priorSummary.matchesPrior'
                        : 'requestForm.priorSummary.differsFromPrior',
                    )}
                  </Pill>
                )}
              </div>
              {identities(items)}
            </li>
          ))}
        </Card>
      )}
    </>
  );
}
