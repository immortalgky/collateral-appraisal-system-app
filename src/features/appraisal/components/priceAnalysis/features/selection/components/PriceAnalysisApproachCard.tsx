import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useSelectionDispatch, useSelectionState } from '../domain/selectionContext';

interface PriceAnalysisApproachCard {
  approach: any;
  isOpen: boolean;
  onToggle: () => void;
}
export const PriceAnalysisApproachCard = ({
  approach,
  isOpen,
  onToggle,
}: PriceAnalysisApproachCard) => {
  const { viewMode } = useSelectionState();
  const dispatch = useSelectionDispatch();
  if (viewMode === 'editing') {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onToggle}
          className={clsx(
            'cursor-pointer text-sm hover:bg-gray-50 rounded-lg',
            isOpen ? 'bg-gray-50' : '',
          )}
        >
          <div
            className={clsx(
              'grid grid-cols-12 gap-2 h-14 px-4 items-center rounded-lg text-gray-400',
              isOpen ? 'bg-gray-50' : '',
            )}
          >
            <div className="col-span-1">
              <Icon
                name={approach.icon}
                style="solid"
                className={clsx('size-4 transition-transform duration-300 ease-in-out')}
              />
            </div>
            <div className="col-span-10 flex items-center justify-start">
              <span>{approach.label}</span>
            </div>
            <div className="col-span-1 flex justify-end">
              <Icon
                name="chevron-down"
                style="solid"
                className={clsx(
                  'size-2 text-gray-400 transition-transform duration-300 ease-in-out',
                  isOpen ? 'rotate-180' : '',
                )}
              />
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className={clsx(
          'grid grid-cols-12 gap-4 justify-between items-center h-14 px-2 text-sm',
          approach.isCandidated ? 'text-primary' : 'text-gray-400',
        )}
      >
        <div className="col-span-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'SUMMARY_SELECT_APPROACH',
                payload: { apprId: approach.id },
              })
            }
            className="cursor-pointer items-center justify-end"
          >
            <Icon
              name="check"
              style="solid"
              className={clsx(
                'size-4 transition-transform duration-300 ease-in-out',
                approach.isCandidated ? 'text-primary' : 'text-gray-400',
              )}
            />
          </button>
        </div>
        <div className="col-span-1">
          <Icon name={approach.icon} style="solid" className={clsx('size-4')} />
        </div>
        <div className="col-span-6">
          <span className="w-full">{approach.label}</span>
        </div>
        <div className="col-span-4 flex gap-1 justify-end items-center">
          <span>{Number(approach.appraisalValue).toLocaleString()}</span>
          <Icon name="baht-sign" style="light" className="size-2" />
        </div>
      </div>
    </div>
  );
};
