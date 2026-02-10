import Button from '@/shared/components/Button';
import { getDesciptions } from '../features/wqs/components/WQSSection';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';

interface MarketSurveySelectionModalProps {
  surveys: Record<string, any>[];
  comparativeSurveys: Record<string, any>[];
  onSelect: (survey: Record<string, any>) => void;
  onCancel: () => void;
}

export const MarketSurveySelectionModal = ({
  surveys,
  comparativeSurveys,
  onSelect,
  onCancel,
}: MarketSurveySelectionModalProps) => {
  const [selectedSurveys, setSelectedSurveys] = useState<Record<string, any>[]>([
    ...comparativeSurveys,
  ]);

  const handleOnSave = () => {
    onSelect(selectedSurveys);
    onCancel();
  };

  const handleOnCancel = () => {
    setSelectedSurveys([]);
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl h-4/5 w-4/5 flex flex-col">
        <span className="text-lg mb-2 shrink-0 font-medium">Select Comparative Data</span>

        <div className="flex-1 overflow-auto space-y-3">
          {surveys.map((survey, idx) => {
            const isSelected = selectedSurveys.some(s => s.id === survey.id);
            return (
              <button
                key={idx}
                onClick={() =>
                  isSelected
                    ? setSelectedSurveys([...selectedSurveys.filter(s => s.id !== survey.id)])
                    : setSelectedSurveys([...selectedSurveys, survey])
                }
                className={clsx(
                  'flex flex-row gap-2 text-left items-center p-4 rounded-lg transition-colors cursor-pointer ',
                  isSelected
                    ? 'border border-primary text-primary transition-all duration-300 ease-in-out'
                    : 'hover:border border-neutral-300 text-neutral-400 hover:text-neutral-800',
                )}
              >
                <div className="flex flex-row items-center gap-2">
                  <div
                    className={clsx(
                      'flex border border-gray-300 rounded-full p-1',
                      isSelected ? 'border-primary' : 'border-gray-300',
                    )}
                  >
                    <Icon
                      name="check"
                      className={clsx(
                        isSelected ? 'text-primary hover:text-primary-700' : 'text-neutral-400',
                      )}
                    />
                  </div>
                  {survey.factors?.map(f => (
                    <div key={f.id} className="text-sm w-60">
                      <span className="font-semibold capitalize">{getDesciptions(f.id)}:</span>{' '}
                      {f.value ?? '-'}
                    </div>
                  )) ?? <></>}
                </div>
              </button>
            );
          })}

          {surveys.length === 0 && (
            <div className="text-center text-gray-500 py-10">No items available</div>
          )}
        </div>

        <div className="mt-6 flex justify-between gap-2 shrink-0">
          <Button variant="ghost" type="button" onClick={() => handleOnCancel()}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={() => handleOnSave()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
