import { useIsMutating } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import Badge from '@/shared/components/Badge';
import { EdgeFades } from '@/shared/components/EdgeFades';
import { useScrollCue } from '@/shared/hooks/useScrollCue';
import Icon from '@/shared/components/Icon';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import { toRaiNganWa } from '@/features/appraisal/utils/areaFormat';

import { useGetProject } from '../../api/project';
import { CALCULATE_MUTATION_KEY } from '../../api/projectUnitPrice';
import { hasStructures, isCondo } from '../../types';
import { useBlockProjectType, useCondoShell } from './CondoShellContext';
import { useCondoRollup } from './useCondoRollup';

/** Tabs whose label carries a count, and where the count comes from. */
const COUNT_TABS = {
  'unit-listing': 'units',
  towers: 'towers',
  models: 'models',
  'project-land': 'titles',
} as const;

const money = (value: number | null) => (value == null ? '—' : `฿${formatNumber(value)}`);

/**
 * The top of the Condo page: which project this is, its headline figures and its tab bar. Reads the
 * tab list from `CondoShellContext` and every figure from `useCondoRollup`, so it takes no props.
 * Render it through `CondoFrame`.
 *
 * A KPI summary card (name + type pill, then one tile per figure; each tile jumps to the tab that
 * holds it) over an icon-pill tab bar in a grey rounded track. Sits outside the scroller.
 */
export function CondoProjectHeader() {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId() ?? '';
  const isReadOnly = usePageReadOnly();
  const { tabs, activeTab, onTabChange } = useCondoShell();
  const { data: project } = useGetProject(appraisalId);
  const projectType = useBlockProjectType();
  const condo = isCondo(projectType);
  // The ProjectType parameter's description, as the type dropdown and change dialog show it; it
  // returns the bare code until parameters load, so the static label is the fallback.
  const typeDescription = useParameterDescription('ProjectType', projectType);
  const typeLabel =
    typeDescription && typeDescription !== projectType
      ? typeDescription
      : t(`condoShell.typeBadge.${projectType}`);
  const rollup = useCondoRollup();
  // The refetched totals land while the calculate mutation is still pending (it awaits them).
  const recalculating = useIsMutating({ mutationKey: CALCULATE_MUTATION_KEY }) > 0;
  // The bar can be wider than the page at 1024: fade the edge that hides tabs, keep the open one in view.
  const { ref: tabsRef, canScrollStart, canScrollEnd } = useScrollCue<HTMLDivElement>(activeTab);

  const name = project?.projectName?.trim() || null;
  const tabCount = (id: string) => {
    const key = COUNT_TABS[id as keyof typeof COUNT_TABS];
    return key ? rollup[key] : undefined;
  };

  const typeBadge = (
    <Badge type="property" value={projectType} dot={false} className="whitespace-nowrap">
      {typeLabel}
    </Badge>
  );
  const readOnlyBadge = isReadOnly && (
    <Badge tone="yellow" dot={false} className="whitespace-nowrap">
      {t('condoShell.readOnly')}
    </Badge>
  );

  return (
    <>
      <div className="flex flex-wrap items-stretch rounded-section border border-(--palette-line) bg-(--palette-surface) shadow-sm">
        <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-2.5 px-3.5 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-base text-primary dark:text-(--palette-accent-ink)">
            <Icon name={condo ? 'building' : 'house'} style="solid" />
          </span>
          <h1
            className={clsx(
              'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold',
              name ? 'text-(--palette-ink)' : 'italic text-(--palette-ink-2)',
            )}
          >
            <span className="min-w-0 break-words">{name ?? t('condoShell.untitled')}</span>
            {typeBadge}
            {readOnlyBadge}
          </h1>
        </div>
        <div className="flex min-w-0 flex-[3_1_32rem] flex-wrap">
          <Kpi
            flashOnChange={recalculating}
            label={t('condoShell.kpi.units')}
            value={formatNumber(rollup.units)}
            sub={t('condoShell.kpi.unitsSub', { n: formatNumber(rollup.sold) })}
            onClick={() => onTabChange('unit-listing')}
          />
          {/* L is appraised as land only and holds no models, so it has no models tile. */}
          {hasStructures(projectType) && (
            <Kpi
              flashOnChange={recalculating}
              label={t('condoShell.kpi.models')}
              value={formatNumber(rollup.models)}
              sub={
                rollup.pendingModels > 0
                  ? t('condoShell.kpi.modelsSub', { n: formatNumber(rollup.pendingModels) })
                  : undefined
              }
              onClick={() => onTabChange('models')}
            />
          )}
          {condo ? (
            <Kpi
              flashOnChange={recalculating}
              label={t('condoShell.kpi.towers')}
              value={formatNumber(rollup.towers)}
              onClick={() => onTabChange('towers')}
            />
          ) : (
            <Kpi
              flashOnChange={recalculating}
              label={t('condoShell.kpi.titles')}
              value={t('condoShell.kpi.titlesValue', { n: formatNumber(rollup.titles) })}
              sub={t('condoShell.kpi.titlesSub', { area: toRaiNganWa(rollup.landSqWa) })}
              onClick={() => onTabChange('project-land')}
            />
          )}
          <Kpi
            flashOnChange={recalculating}
            label={t('condoShell.kpi.priced')}
            value={`${formatNumber(rollup.priced)} / ${formatNumber(rollup.units)}`}
            onClick={() => onTabChange('unit-price')}
          />
          <Kpi
            flashOnChange={recalculating}
            label={t('condoShell.kpi.value')}
            value={money(rollup.appraisedTotal)}
            tone="highlight"
            onClick={() => onTabChange('unit-price')}
          />
          <Kpi
            flashOnChange={recalculating}
            label={t('condoShell.kpi.force')}
            value={money(rollup.forceSaleTotal)}
            onClick={() => onTabChange('unit-price')}
          />
        </div>
      </div>

      <div className="relative mt-2">
        <div
          ref={tabsRef}
          role="tablist"
          aria-label={t('condoShell.tabsLabel')}
          className="flex gap-0.5 overflow-x-auto rounded-section border border-(--palette-line-soft) bg-(--palette-surface-2) p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map(tab => {
            const isActive = tab.id === activeTab;
            const count = tabCount(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-(--palette-surface) font-semibold text-primary-700 shadow-sm dark:text-(--palette-accent-ink)'
                    : 'text-(--palette-ink-2) hover:bg-(--palette-surface)/60 hover:text-(--palette-ink)',
                )}
              >
                <Icon
                  name={tab.icon}
                  style="solid"
                  className={clsx(
                    'text-sm',
                    isActive
                      ? 'text-primary dark:text-(--palette-accent-ink)'
                      : 'text-(--palette-ink-3)',
                  )}
                />
                {tab.label}
                {count != null && (
                  <span className="rounded-full bg-(--palette-surface-3) px-1.5 text-xs tabular-nums text-(--palette-ink-2)">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {/* End room: a flex scroller can leave its end padding out of the scrollable width, which
            cut the last tab a few px short of the edge when it was the open one. */}
          <span aria-hidden className="w-2 shrink-0" />
        </div>
        <EdgeFades
          start={canScrollStart}
          end={canScrollEnd}
          fromClass="from-(--palette-surface-2)"
        />
      </div>
    </>
  );
}

interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'highlight';
  /** True while a recalculation is running: a change to `value` now gets the highlight. */
  flashOnChange: boolean;
  onClick: () => void;
}

/** One tile of the summary card; clicking it opens the tab that holds the figure. */
function Kpi({ label, value, sub, tone, flashOnChange, onClick }: KpiProps) {
  // Bumped on each change made by a recalculation; used as the key so the CSS animation restarts.
  // Starts at 0, so a first load or a remount (tab switch) never flashes.
  const [flashes, setFlashes] = useState(0);
  const shown = useRef(value);
  useEffect(() => {
    if (shown.current === value) return;
    shown.current = value;
    if (flashOnChange) setFlashes(n => n + 1);
  }, [value, flashOnChange]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col justify-center border-l border-(--palette-line-soft) px-3 py-1 text-left hover:bg-(--palette-surface-2)"
    >
      <span className="whitespace-nowrap text-xs text-(--palette-ink-2)">{label}</span>
      <span
        key={flashes}
        data-flash={flashes > 0 || undefined}
        className={clsx(
          'whitespace-nowrap text-sm font-semibold tabular-nums',
          tone === 'highlight' && 'text-primary-700 dark:text-(--palette-accent-ink)',
          !tone && 'text-(--palette-ink)',
        )}
      >
        {value}
        {sub && <small className="ml-1 text-xs font-normal text-(--palette-ink-2)">{sub}</small>}
      </span>
    </button>
  );
}
