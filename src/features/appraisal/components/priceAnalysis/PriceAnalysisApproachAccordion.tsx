import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';
import { MethodCard } from './MethodCard';

interface PriceAnalysisApproachAccordian {
  viewMode: 'editing' | 'summary';
  approach: any;
}

export const PriceAnalysisApproachAccordion = ({
  viewMode,
  approach,
}: PriceAnalysisApproachAccordian) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOnOpen = () => {
    setIsOpen(!isOpen);
  };

  if (viewMode === 'editing') {
    return (
      <div className="flex flex-col">
        <div
          className={clsx(
            'flex flex-row gap-4 justify-between items-center h-14 px-4 hover:bg-gray-50 rounded-lg',
            isOpen ? 'bg-gray-50' : '',
          )}
        >
          <Icon
            name={approach.icon}
            style="solid"
            className={clsx('size-4 transition-transform duration-300 ease-in-out')}
          />
          <span className="w-full">{approach.label}</span>
          <button type="button" onClick={handleOnOpen} className="cursor-pointer text-sm">
            <Icon
              name="chevron-down"
              style="solid"
              className={clsx(
                'size-2 text-gray-400 transition-transform duration-300 ease-in-out',
                isOpen ? 'rotate-180' : '',
              )}
            />
          </button>
        </div>

        <div
          className={clsx(
            'transition-all ease-in-out duration-300 overflow-hidden',
            isOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0',
          )}
        >
          {/* method */}
          <div className="flex flex-col gap-2 ml-4 pl-4 border-l border-base-300">
            {approach.methods.map(method => (
              <MethodCard
                key={method.id}
                viewMode={viewMode}
                approachId={approach.id}
                method={method}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-4 justify-between items-center h-14 px-2">
        <Icon name={approach.icon} style="solid" className={clsx('size-4')} />
        <span className="w-full">{approach.label}</span>
        <div className="flex items-center gap-2">
          <span>{Number(approach.appraisalValue).toLocaleString()}</span>
          <Icon name="baht-sign" style="light" className="size-2" />
        </div>
      </div>

      <div className={clsx('transition-all ease-in-out duration-300 overflow-hidden')}>
        {/* method */}
        <div className="flex flex-col gap-2 ml-4 pl-4 border-l border-base-300">
          {approach.methods.map(method => (
            <div key={method.id}>
              <MethodCard viewMode={viewMode} approachId={approach.id} method={method} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
