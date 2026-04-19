import type { DCFAssumption, DCFCategory, DCFSection } from '../../types/dcf';
import { useFormContext, type UseFormGetValues, useWatch } from 'react-hook-form';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import { Icon } from '@shared/components';
import { DiscountedCashFlowModalRenderer } from './DiscountedCashFlowMethodModalRenderer';
import { MethodSpecifiedRoomIncomePerDaySummary } from './dcfMethods/MethodSpecifiedRoomIncomePerDaySummary';
import { assumptionParams, methodParams } from '../../data/dcfParameters';
import { mapDCFMethodCodeToSystemType } from '../../domain/mapDCFMethodCodeToSystemType';
import { DisplayOnlyProvider } from '../table/RHFInputCell';

interface DiscountedCashFlowSummaryAssumptionProps {
  properties: Record<string, unknown>[];
  getValues: UseFormGetValues<any>;
  showAssumptionSummary: boolean;
  onShowAssumptionSummary: () => void;
}

interface ViewAssumptionSummaryButtonProps {
  onClick: () => void;
}

export function ViewAssumptionSummaryButton({ onClick }: ViewAssumptionSummaryButtonProps) {
  return (
    <button
      type="button"
      onClick={e => {
        // Prevent <details>/<summary> parents (e.g. CollapsibleFormSection header
        // action slot) from toggling when this button is clicked.
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-xs font-medium text-gray-700 transition-colors cursor-pointer shadow-sm"
    >
      <Icon name="list-check" style="regular" className="size-3" />
      View Assumption Summary
    </button>
  );
}

interface SectionTheme {
  bg: string;
  bgSoft: string;
  accent: string;
  accentSoft: string;
  icon: string;
  text: string;
  border: string;
}

const sectionThemes: Record<'income' | 'expenses', SectionTheme> = {
  income: {
    bg: 'bg-[#EFF8FF]',
    bgSoft: 'bg-[#F5FAFF]',
    accent: 'bg-[#2B7DE9]',
    accentSoft: 'bg-[#C4DFFA]',
    icon: 'circle-dollar',
    text: 'text-[#2B7DE9]',
    border: 'border-[#C4DFFA]',
  },
  expenses: {
    bg: 'bg-[#FFF5F0]',
    bgSoft: 'bg-[#FFFAF7]',
    accent: 'bg-[#E8652B]',
    accentSoft: 'bg-[#FACEBE]',
    icon: 'cart-shopping',
    text: 'text-[#E8652B]',
    border: 'border-[#FACEBE]',
  },
};

export function DiscountedCashFlowSummaryAssumption({
  properties,
  getValues,
  showAssumptionSummary,
  onShowAssumptionSummary,
}: DiscountedCashFlowSummaryAssumptionProps) {
  const { control } = useFormContext();
  const sections = (useWatch({ name: 'sections', control }) ?? []) as DCFSection[];

  return (
    <Modal
      isOpen={showAssumptionSummary}
      onClose={onShowAssumptionSummary}
      title="Assumption Summary"
      size="3xl"
    >
        <DisplayOnlyProvider value={true}>
          <div
            className={clsx(
              // Whole popup scrolls via Modal's outer overlay — no inner vertical scroll.
              'min-w-0 w-full flex flex-col gap-5',
              // Collapse fixed-width input wrappers from the edit modals.
              '[&_.w-20]:w-auto [&_.w-24]:w-auto [&_.w-36]:w-auto [&_.w-44]:w-auto',
              '[&_.w-48]:w-auto [&_.w-56]:w-auto [&_.w-64]:w-auto [&_.w-72]:w-auto',
              // Force natural height for ScrollableTableContainer rows (designed for
              // flex-column parents with established height).
              '[&_.h-full]:h-auto',
              "[&_[style*='max-height']]:!max-h-none",
            )}
          >
            {sections.map((section, sectionIdx) => {
              if (section.sectionType !== 'income' && section.sectionType !== 'expenses') return null;

              const theme = sectionThemes[section.sectionType];
              const renderableCategories = (section.categories ?? []).filter(
                (c: DCFCategory) =>
                  c.categoryType === 'income' ||
                  c.categoryType === 'expenses' ||
                  c.categoryType === 'fixedExps',
              );
              if (renderableCategories.length === 0) return null;

              const assumptionCount = renderableCategories.reduce(
                (sum, c) => sum + (c.assumptions?.length ?? 0),
                0,
              );

              return (
                <section
                  key={section.clientId ?? sectionIdx}
                  className={clsx(
                    'rounded-xl border overflow-hidden min-w-0 shadow-sm',
                    theme.border,
                  )}
                >
                  <header
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 border-b',
                      theme.bg,
                      theme.border,
                    )}
                  >
                    <div
                      className={clsx(
                        'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                        theme.accent,
                      )}
                    >
                      <Icon name={theme.icon} style="solid" className="size-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={clsx(
                          'text-[10px] font-semibold tracking-wider uppercase',
                          theme.text,
                        )}
                      >
                        Section
                      </div>
                      <div className="text-base font-semibold text-gray-900 truncate">
                        {section.sectionName}
                      </div>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex items-center justify-center h-6 px-2 rounded-full text-xs font-semibold',
                        theme.accentSoft,
                        theme.text,
                      )}
                    >
                      {assumptionCount} {assumptionCount === 1 ? 'assumption' : 'assumptions'}
                    </span>
                  </header>

                  <div className="flex flex-col divide-y divide-gray-100 min-w-0 bg-white">
                    {renderableCategories.map((category: DCFCategory) => {
                      const categoryIdx = (section.categories ?? []).indexOf(category);
                      return (
                        <div key={category.clientId ?? categoryIdx} className="px-4 py-3 min-w-0">
                          <div className="flex flex-row items-center gap-2 mb-2">
                            <span
                              className={clsx('inline-block w-1 h-4 rounded', theme.accent)}
                              aria-hidden
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              {category.categoryName}
                            </span>
                            <span
                              className={clsx(
                                'inline-flex items-center justify-center min-w-5 h-4 px-1.5 rounded text-[10px] font-semibold',
                                theme.accentSoft,
                                theme.text,
                              )}
                            >
                              {category.assumptions?.length ?? 0}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 min-w-0">
                            {(category.assumptions ?? []).map(
                              (assumption: DCFAssumption, assumptionIdx: number) => {
                                const methodCode = assumption.method?.methodType ?? null;
                                const systemMethodType = methodCode
                                  ? mapDCFMethodCodeToSystemType(methodCode)
                                  : null;
                                if (!systemMethodType) return null;

                                const methodLabel =
                                  methodParams.find(m => m.code === methodCode)?.description ?? '';
                                const displayName =
                                  assumption.assumptionName ||
                                  assumptionParams.find(p => p.code === assumption.assumptionType)
                                    ?.description ||
                                  assumption.assumptionType ||
                                  'Assumption';

                                const methodProps = {
                                  name: `sections.${sectionIdx}.categories.${categoryIdx}.assumptions.${assumptionIdx}.method.detail`,
                                  methodType: systemMethodType,
                                  properties,
                                  getOuterFormValues: getValues,
                                };

                                return (
                                  <div
                                    key={assumption.clientId ?? assumptionIdx}
                                    className="rounded-lg border border-gray-200 bg-gray-50/40 hover:bg-gray-50 transition-colors min-w-0"
                                  >
                                    <div className="flex flex-row items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 bg-white rounded-t-lg">
                                      <span className="text-sm font-semibold text-gray-800 truncate">
                                        {displayName}
                                      </span>
                                      {methodLabel && (
                                        <span
                                          className={clsx(
                                            'inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                                            theme.border,
                                            theme.text,
                                            theme.bg,
                                          )}
                                        >
                                          <Icon
                                            name="function"
                                            style="regular"
                                            className="size-2.5"
                                          />
                                          {methodLabel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="px-3 py-2 overflow-x-auto max-w-full min-w-0">
                                      {methodCode === '01' ? (
                                        <MethodSpecifiedRoomIncomePerDaySummary
                                          name={methodProps.name}
                                        />
                                      ) : (
                                        <DiscountedCashFlowModalRenderer {...methodProps} />
                                      )}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </DisplayOnlyProvider>
    </Modal>
  );
}
