import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useSelectionDispatch } from '../domain/selectionContext';

interface PriceAnalysisMethodCardProps {
  viewMode: 'editing' | 'summary';
  approachId: string;
  method: any;
  onSelectMethod: (approachId: string, methodId: string) => void;
  onSelectCalculationMethod?: (methodId: string) => void;
}

export const PriceAnalysisMethodCard = ({
  viewMode,
  approachId,
  method,
  onSelectMethod,
  onSelectCalculationMethod,
}: PriceAnalysisMethodCardProps) => {
  const dispatch = useSelectionDispatch();
  if (viewMode === 'editing') {
    return (
      <div
        className={clsx(
          'flex flex-col items-center h-14 transition-all duration-300 rounded-lg',
          method.isSelected ? 'text-primary' : 'text-gray-400',
        )}
      >
        <button
          className={clsx(
            'grid grid-cols-12 items-center justify-start cursor-pointer w-full h-full transition-all duration-300 px-4 py-2 rounded-lg',
            method.isSelected ? '  text-primary' : '',
            'hover:bg-primary/10',
          )}
          onClick={() => onSelectMethod(approachId, method.id)}
        >
          <div className="col-span-1">
            <Icon name={'check'} style="solid" className={clsx('size-3')} />
          </div>
          <div className="col-span-1">
            <Icon name={method.icon} style="solid" className="size-3" />
          </div>
          <div className="col-span-10 flex flex-row items-center justify-start">
            <span>{method.label}</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'grid grid-cols-12 gap-4 items-center h-16 py-2 px-4 transition-all duration-300 rounded-lg',
        'hover:bg-primary/10',
        method.isCandidated ? 'text-primary' : 'text-gray-400',
      )}
    >
      <div className="col-span-1 flex items-center justify-center">
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'SUMMARY_SELECT_METHOD',
              payload: { apprId: approachId, methodId: method.id },
            })
          }
          className="cursor-pointer"
        >
          <Icon
            name="check"
            style="solid"
            className={clsx(
              'size-4 transition-transform duration-300 ease-in-out',
              method.isCandidated ? 'text-primary' : 'text-gray-400',
            )}
          />
        </button>
      </div>
      <div className="col-span-1 flex items-center">
        <Icon name={method.icon} style="solid" className="size-4" />
      </div>
      <div className="col-span-9 flex flex-col">
        <div className="flex">
          <span>{method.label}</span>
        </div>
        <div className="flex items-center justify-start gap-1 py-1 text-xs">
          <Icon name="baht-sign" style="light" className="size-4" />
          <span className="truncate">{Number(method.appraisalValue).toLocaleString()}</span>
        </div>
      </div>
      <div className="col-span-1 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onSelectCalculationMethod(method.id)}
          className="cursor-pointer items-center justify-end"
        >
          <Icon
            name="pen"
            style="solid"
            className={clsx('size-4 transition-transform duration-300 ease-in-out text-black')}
          />
        </button>
      </div>
    </div>
  );
};
