import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { PropertyTypeChip } from '@features/appraisal/components/PropertyTypeChip';
import { mapGroupItemToPropertyItem } from '@features/appraisal/hooks/useEnrichedPropertyGroups';
import { ServerDataCtx } from '@features/pricingAnalysis/store/selectionContext';

/**
 * Left rail beside the approach/method board — mock `.sideL.props` (mock:1038, content from
 * `propsHtml()` at mock:3323). Gives the board a fixed property reference instead of it floating
 * alone in its card. Reads `groupDetail` off `ServerDataCtx` and reuses `mapGroupItemToPropertyItem`
 * — same source and mapper as the group popover in PricingAnalysisPage's top bar — so this adds no
 * new fetch.
 */
export function PricingAnalysisPropertyRail() {
  const { t } = useTranslation('pricingAnalysis');
  const serverData = useContext(ServerDataCtx);

  const items = useMemo(
    () =>
      (serverData?.groupDetail?.properties ?? [])
        .slice()
        .sort((a, b) => (a.sequenceInGroup ?? 0) - (b.sequenceInGroup ?? 0))
        .map(mapGroupItemToPropertyItem),
    [serverData?.groupDetail?.properties],
  );

  // Project-model subjects have no groupDetail — flatContext carries the model's name instead.
  // mock:3326 shows a full model card here; that card (ModelCardContent) is built for the 50%-wide
  // accordion panel, not a 268px rail, so this is a compact name-only fallback rather than reusing
  // it as-is.
  if (!serverData?.groupDetail) {
    const flat = serverData?.flatContext;
    if (!flat) return null;
    return (
      <aside className="w-[268px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white px-3 pt-1 pb-4">
        <h5 className="mt-2.5 mb-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-400">
          {t('page.tabs.model')}
        </h5>
        <p className="text-xs text-gray-700 truncate">
          {flat.projectName ? String(flat.projectName) : 'Project'}
          {' › '}
          {flat.modelName ? String(flat.modelName) : 'Model'}
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-[268px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white px-3 pt-1 pb-4">
      <h5 className="mt-2.5 mb-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-400">
        {t('rail.title', { count: items.length })}
      </h5>
      {items.length === 0 ? (
        <p className="py-3 text-xs text-gray-400">{t('accordion.noProperties')}</p>
      ) : (
        items.map(p => (
          <div
            key={p.id}
            className="grid grid-cols-[40px_1fr] gap-2 py-[7px] border-b border-gray-100 last:border-b-0"
          >
            <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
              {p.image ? (
                <img src={p.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon name="image" className="text-gray-300 text-sm" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-gray-900 truncate">
                {p.titleNo || p.address}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-gray-400">
                <PropertyTypeChip code={p.type} />
                <span className="truncate">{p.area}</span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-gray-400 truncate">{p.location}</div>
            </div>
          </div>
        ))
      )}
    </aside>
  );
}
