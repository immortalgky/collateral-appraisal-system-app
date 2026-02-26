import Button from '@/shared/components/Button';
import { Icon } from '@/shared/components';
import Modal from '@shared/components/Modal';
import clsx from 'clsx';
import { useContext, useState } from 'react';
import { ServerDataCtx } from '@features/pricingAnalysis/store/selectionContext';
import type { FactorDataType, MarketComparableDetailType } from '../schemas';
import { readFactorValue } from '../domain/readFactorValue';
import { getFactorDesciption } from '@features/pricingAnalysis/domain/getFactorDescription.ts';

interface MarketSurveySelectionModalProps {
  isOpen: boolean;
  surveys: MarketComparableDetailType[];
  comparativeSurveys: MarketComparableDetailType[];
  onSelect: (survey: MarketComparableDetailType[]) => void;
  onCancel: () => void;
}

export const MarketSurveySelectionModal = ({
  isOpen,
  surveys,
  comparativeSurveys,
  onSelect,
  onCancel,
}: MarketSurveySelectionModalProps) => {
  const serverData = useContext(ServerDataCtx);
  const [selectedSurveys, setSelectedSurveys] = useState<MarketComparableDetailType[]>([
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
    <Modal isOpen={isOpen} onClose={handleOnCancel} title="Select Comparative Data" size="2xl">
      <div className="h-[60vh] overflow-auto space-y-3">
        {(surveys ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Icon name="magnifying-glass" className="size-10 mb-3" />
            <span className="text-base">No market comparables available</span>
          </div>
        ) : (
          (surveys ?? []).map((survey, idx) => {
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
                  {(survey.factorData ?? []).map((factor: FactorDataType) => (
                    <div key={factor.id} className="text-sm w-60">
                      <span className="font-semibold capitalize">
                        {getFactorDesciption(factor.factorCode, serverData.allFactors ?? [])}:
                      </span>{' '}
                      {readFactorValue({
                        dataType: factor.dataType,
                        fieldDecimal: factor.fieldDecimal,
                        value: factor.value,
                      }) ?? '-'}
                    </div>
                  ))}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-6 flex justify-between gap-2 border-t border-gray-200 pt-4">
        <Button variant="ghost" type="button" onClick={() => handleOnCancel()}>
          Cancel
        </Button>
        <Button variant="primary" type="button" onClick={() => handleOnSave()}>
          Save
        </Button>
      </div>
    </Modal>
  );
};
