import { Icon } from '@/shared/components';
import { Checkbox } from '@/shared/components/inputs';
import clsx from 'clsx';
import { useSelectionDispatch } from './PriceAnalysisAccordion';

interface MethodCardProps {
  viewMode: 'editing' | 'summary';
  approachId: string;
  method: any;
}

export const MethodCard = ({ viewMode, approachId, method }: MethodCardProps) => {
  const dispatch = useSelectionDispatch();

  if (viewMode === 'editing') {
    return (
      <div
        className={clsx(
          'flex flex-col items-center h-14 py-2 px-4 transition-all duration-300 rounded-lg',
          method.isSelected ? ' bg-primary/10 text-primary' : '',
        )}
      >
        <button
          className="flex flex-row items-center cursor-pointer w-full h-full"
          onClick={() =>
            dispatch({
              type: 'EDIT_TOGGLE_METHOD',
              payload: { apprId: approachId, methodId: method.id },
            })
          }
        >
          <Icon name={method.icon} style="solid" className="size-3" />
          <span className="w-full">{method.label}</span>
          <Icon
            name={'check'}
            style="solid"
            className={clsx('size-3', method.isSelected ? 'opacity-100' : 'opacity-0')}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'grid grid-cols-12 gap-4 items-center h-16 py-2 px-4 transition-all duration-300 rounded-lg',
        'hover:bg-primary/10',
      )}
    >
      <div className="col-span-1 flex items-center">
        <Icon name={method.icon} style="solid" className="size-4" />
      </div>
      <div className="col-span-10 flex flex-col">
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
          onClick={() => null}
          className="cursor-pointer items-center justify-end"
        >
          <Icon
            name="pen"
            style="solid"
            className={clsx('size-4 transition-transform duration-300 ease-in-out')}
          />
        </button>
      </div>
    </div>
  );
};
