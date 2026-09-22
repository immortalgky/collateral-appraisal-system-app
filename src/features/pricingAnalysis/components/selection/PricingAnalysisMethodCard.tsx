import { Icon } from '@/shared/components';
import clsx from 'clsx';
import type { Method } from '../../types/selection';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface PricingAnalysisMethodCardProps {
  /** Editing mode only — see PricingAnalysisMethodBoard for the summary-mode table that
   *  replaced this component's former grid/list rendering. */
  viewMode: 'editing';
  approachType: string;
  method: Method;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
}

export const PricingAnalysisMethodCard = ({
  approachType,
  method,
  onDeleteMethod,
}: PricingAnalysisMethodCardProps) => {
  const isReadOnly = usePageReadOnly();

  return (
    <div
      className={clsx(
        'flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200',
        'bg-primary/5 text-primary',
      )}
    >
      <Icon name={method.icon} style="solid" className="size-3 shrink-0" />
      <span className="flex-1 text-left font-medium">{method.label}</span>
      {!isReadOnly && onDeleteMethod && method.id && (
        <button
          type="button"
          className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            onDeleteMethod({ approachType, methodType: method.methodType });
          }}
        >
          <Icon
            name="trash"
            style="solid"
            className="size-3.5 text-gray-400 hover:text-red-500 transition-colors"
          />
        </button>
      )}
    </div>
  );
};
