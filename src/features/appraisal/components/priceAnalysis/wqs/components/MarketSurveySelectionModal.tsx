import Button from '@/shared/components/Button';
import { getDesciptions } from '../WQSSection';
import { Icon } from '@/shared/components';
import clsx from 'clsx';

interface MarketSurveySelectionModalProps {
  allFactors: Record<string, any>[];
  surveys: Record<string, any>[];
  comparativeSurveys: Record<string, any>[];
  onSelect: (survey: Record<string, any>) => void;
  onCancel: () => void;
}

export const MarketSurveySelectionModal = ({
  allFactors,
  surveys,
  comparativeSurveys,
  onSelect,
  onCancel,
}: MarketSurveySelectionModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl h-4/5 w-4/5 flex flex-col">
        <h2 className="text-lg mb-2 shrink-0">Select Comparative Data</h2>
        <div className="h-[0.1px] bg-gray-300 my-2 col-span-5"></div>

        <div className="flex-1 overflow-auto space-y-3">
          {surveys.map((survey, idx) => {
            const isSelected = comparativeSurveys.some(s => s.id === survey.id);
            return (
              <button
                key={idx}
                onClick={() => onSelect(survey)}
                className={clsx(
                  'flex gap-2 text-left p-4 rounded-lg transition-colors cursor-pointer ',
                  isSelected
                    ? 'bg-primary/10 border border-primary text-primary transition-all duration-300 ease-in-out'
                    : 'hover:bg-primary/10 hover:border border-neutral-300 text-neutral-400 hover:text-neutral-800',
                )}
              >
                <div className="flex flex-row gap-2">
                  <div className="w-14">
                    <Icon
                      name="check"
                      className={clsx(
                        isSelected ? 'text-primary hover:text-primary-700' : 'text-neutral-400',
                      )}
                    />
                  </div>
                  {survey.factors.map(f => (
                    <div key={f.id} className="text-sm w-60">
                      <span className="font-semibold capitalize">{getDesciptions(f.id)}:</span>{' '}
                      {f.value ?? '-'}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}

          {surveys.length === 0 && (
            <div className="text-center text-gray-500 py-10">No items available</div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
