import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { FormSection, FormSheet } from '@/shared/components/form/FormSheet';

import { useCondoFocus } from '../CondoShellContext';

// ── Results next to the assumption panel ──────────────────────────────────────

type PanelState = 'open' | 'strip';

/** The viewport width from which the panel starts open when the user has not chosen yet. */
const OPEN_FROM_PX = 1600;
// A per-browser preference, not data: kept here rather than in the shared UI store.
const PANEL_KEY = 'blockProject.assumptionsPanel';

const readChoice = (): PanelState | null => {
  try {
    const v = localStorage.getItem(PANEL_KEY);
    return v === 'open' || v === 'strip' ? v : null;
  } catch {
    return null; // private window / blocked storage: fall back to the width rule
  }
};
const writeChoice = (v: PanelState) => {
  try {
    localStorage.setItem(PANEL_KEY, v);
  } catch {
    // the choice just is not remembered
  }
};

/** The few figures the collapsed strip keeps on show. */
export interface AssumptionStripInfo {
  /** "01" / "02": the location method's code. */
  method: string | null;
  methodTitle: string | null;
  /** The forced-sale percentage the prices use. */
  forceSale: number | null;
  /** How many assumption values the panel holds. */
  count: number;
  /** An assumption or flag has been edited and not saved. */
  edited: boolean;
}

interface CondoPriceLayoutProps {
  results: ReactNode;
  /** The assumption form; omit it (Imported view, or the assumption not known yet) for a full-width results area. */
  panel?: ReactNode;
  /** What the collapsed strip shows. */
  stripInfo?: AssumptionStripInfo;
  /**
   * Bump to bring the panel back (without changing the remembered choice): a save the form
   * refused must show the field that is wrong.
   */
  revealPanel?: number;
}

/**
 * Results on the left, the assumption panel on the right (sticky). The panel collapses to a narrow
 * strip. With no remembered choice it starts collapsed below 1600px; the choice is kept in this
 * browser. "Expand table" folds it too and gives it back on exit, without touching the choice. In
 * a narrow area an open panel moves above the results; the breakpoint follows the page area
 * (container query), not the viewport, so the sidebar and the window size both count.
 */
export function CondoPriceLayout({
  results,
  panel,
  stripInfo,
  revealPanel = 0,
}: CondoPriceLayoutProps) {
  const { t } = useTranslation('blockProject');
  const { focus } = useCondoFocus();
  const [choice, setChoice] = useState<PanelState>(
    () => readChoice() ?? (window.innerWidth >= OPEN_FROM_PX ? 'open' : 'strip'),
  );
  // "Expand table" folds the panel while it lasts; picking a state by hand takes the fold off.
  const [folded, setFolded] = useState(focus);
  useEffect(() => {
    setFolded(focus);
  }, [focus]);
  useEffect(() => {
    if (revealPanel > 0) {
      setChoice('open');
      setFolded(false);
    }
  }, [revealPanel]);
  const choose = (v: PanelState) => {
    setChoice(v);
    setFolded(false);
    writeChoice(v);
  };

  const open = !folded && choice === 'open';
  const showPanel = !!panel && open;
  const showStrip = !!panel && !open;
  const panelTitle = t('condoUnitsPrice.assumptions.panelTitle');

  return (
    <div className="@container">
      <div
        className={clsx(
          'grid items-start gap-3',
          showPanel && '@min-[66rem]:grid-cols-[minmax(0,1fr)_23.7rem]',
          showStrip && 'grid-cols-[minmax(0,1fr)_3.5rem]',
        )}
      >
        <div className="min-w-0">{results}</div>

        {showStrip && (
          <aside
            aria-label={panelTitle}
            className="sticky top-0 flex flex-col items-center gap-2.5 rounded-section border border-(--palette-line) bg-(--palette-surface) pt-1.5 pb-3 shadow-sm"
          >
            <button
              type="button"
              aria-expanded={false}
              aria-label={t('condoUnitsPrice.assumptions.showPanel')}
              title={t('condoUnitsPrice.assumptions.showPanel')}
              onClick={() => choose('open')}
              className="flex w-full flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs font-medium text-(--palette-accent-ink) hover:bg-(--palette-surface-3)"
            >
              <Icon name="chevron-left" style="solid" />
              <span>{t('condoUnitsPrice.assumptions.show')}</span>
            </button>
            <div className="flex flex-col items-center gap-2 text-(--palette-ink)">
              <Icon name="sliders" style="light" className="text-(--palette-accent-ink)" />
              <span className="text-sm font-semibold [writing-mode:vertical-rl]">{panelTitle}</span>
            </div>
            {stripInfo && <StripFigures info={stripInfo} />}
          </aside>
        )}

        {showPanel && (
          // The assumptions are a form: a FormSheet with one FormSection (DESIGN.md 17.6).
          <FormSheet className="order-first @min-[66rem]:sticky @min-[66rem]:top-0 @min-[66rem]:order-none @min-[66rem]:max-h-[calc(100cqh-0.5rem)] @min-[66rem]:overflow-auto">
            <FormSection
              title={panelTitle}
              icon="sliders"
              actions={
                <button
                  type="button"
                  aria-expanded
                  onClick={() => choose('strip')}
                  aria-label={t('condoUnitsPrice.assumptions.hidePanel')}
                  title={t('condoUnitsPrice.assumptions.hidePanel')}
                  className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-(--palette-ink-2) hover:bg-(--palette-surface-3)"
                >
                  <Icon name="chevron-right" style="solid" />
                  {t('condoUnitsPrice.assumptions.hide')}
                </button>
              }
            >
              <div className="col-span-12">{panel}</div>
            </FormSection>
          </FormSheet>
        )}
      </div>
    </div>
  );
}

/** Method code, forced-sale %, value count and, when assumptions are dirty, the "edited" mark. */
function StripFigures({ info }: { info: AssumptionStripInfo }) {
  const { t } = useTranslation('blockProject');
  const pill = (title: string, text: string, key: string) => (
    <Badge
      key={key}
      size="sm"
      tone="gray"
      dot={false}
      title={title}
      className="cursor-help whitespace-nowrap tabular-nums"
    >
      {text}
    </Badge>
  );
  return (
    <div className="flex w-full flex-col items-center gap-1.5 border-t border-(--palette-line) px-1 pt-2.5">
      {info.method && pill(info.methodTitle ?? info.method, info.method, 'method')}
      {info.forceSale != null &&
        pill(t('condoUnitsPrice.assumptions.strip.forceSale'), `${info.forceSale}%`, 'force')}
      {pill(
        t('condoUnitsPrice.assumptions.strip.count', { count: info.count }),
        String(info.count),
        'count',
      )}
      {info.edited && (
        <Badge
          size="sm"
          tone="yellow"
          dot={false}
          title={t('condoUnitsPrice.assumptions.strip.editedTitle')}
          className="whitespace-nowrap"
        >
          {t('condoUnitsPrice.assumptions.strip.edited')}
        </Badge>
      )}
    </div>
  );
}
