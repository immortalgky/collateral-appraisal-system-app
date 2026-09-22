import clsx from 'clsx';
import { PricingAnalysisApproachCard } from './PricingAnalysisApproachCard';
import { PricingAnalysisMethodCard } from './PricingAnalysisMethodCard';
import { Icon } from '@/shared/components';
import type { Approach } from '../../types/selection';
import type { PricingAnalysisConfigType } from '../../schemas';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface PricingAnalysisApproachAccordionProps {
  /** Editing mode only — decides which methods exist on an approach. The summary-mode
   *  approach + method display now lives in PricingAnalysisMethodBoard. */
  viewMode: 'editing';
  approach: Approach;

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  configMethods?: PricingAnalysisConfigType['methods'];
}

export const PricingAnalysisApproachAccordion = ({
  viewMode,
  approach,
  onAddMethod,
  onDeleteMethod,
  configMethods,
}: PricingAnalysisApproachAccordionProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const hasSelectedMethods = approach.methods.some(m => m.isIncluded);
  const [isOpen, setIsOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isReadOnly = usePageReadOnly();

  // Methods from config that are not yet selected in the approach
  const selectedMethodTypes = new Set(
    approach.methods.filter(m => m.isIncluded).map(m => m.methodType),
  );
  const availableMethods = (configMethods ?? []).filter(
    cm => !selectedMethodTypes.has(cm.methodType),
  );

  const includedMethods = approach.methods.filter(m => m.isIncluded);

  return (
    <div>
      <PricingAnalysisApproachCard
        viewMode={viewMode}
        approach={approach}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div
          className={clsx(
            'flex flex-col gap-1 ml-4 pl-4 border-l-2 mt-2',
            hasSelectedMethods ? 'border-primary/30' : 'border-gray-200',
          )}
        >
          {includedMethods.map(method => (
            <PricingAnalysisMethodCard
              key={method.methodType}
              viewMode={viewMode}
              approachType={approach.approachType}
              method={method}
              onDeleteMethod={isReadOnly ? undefined : onDeleteMethod}
            />
          ))}

          {/* + Add Method inline list */}
          {!isReadOnly && onAddMethod && availableMethods.length > 0 && (
            <div>
              <button
                type="button"
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Icon name={isDropdownOpen ? 'minus' : 'plus'} style="solid" className="size-3" />
                <span className="font-medium">{t('approaches.addMethod')}</span>
              </button>
              {isDropdownOpen && (
                <div className="flex flex-col gap-0.5 mt-1 ml-2 pl-3 border-l border-dashed border-gray-300">
                  {availableMethods.map(cm => (
                    <button
                      key={cm.methodType}
                      type="button"
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        onAddMethod({
                          approachType: approach.approachType,
                          methodType: cm.methodType,
                        });
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Icon name={cm.icon ?? 'image'} style="solid" className="size-3 shrink-0" />
                      <span>{cm.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
