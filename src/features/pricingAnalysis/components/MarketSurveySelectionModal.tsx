import Button from '@/shared/components/Button';
import { Icon } from '@/shared/components';
import Modal from '@shared/components/Modal';
import clsx from 'clsx';
import { useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    setSelectedSurveys(comparativeSurveys);
  }, [comparativeSurveys]);

  return (
    <Modal isOpen={isOpen} onClose={handleOnCancel} title="Select Comparative Data" size="2xl">
      <div className="h-[60vh] overflow-auto space-y-3">
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="table table-sm min-w-max">
              <thead className="sticky top-0 z-20 bg-gray-50">
                <tr>
                  <th className="font-medium text-right text-gray-600 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() =>
                        selectedSurveys.length === surveys.length
                          ? setSelectedSurveys([])
                          : setSelectedSurveys([...surveys])
                      }
                      className={clsx(
                        'bg-white flex flex-row gap-2 text-left items-center justify-center w-6 h-6 rounded-md transition-colors cursor-pointer ',
                        selectedSurveys.length === surveys.length
                          ? 'border border-primary text-primary transition-all duration-300 ease-in-out'
                          : 'border border-hray-300 hover:border border-neutral-300 text-neutral-400 hover:text-neutral-800',
                      )}
                    >
                      {selectedSurveys.length === surveys.length && (
                        <Icon
                          name="check"
                          className={clsx('text-primary hover:text-primary-700')}
                        />
                      )}
                    </button>
                  </th>
                  <th className="font-medium text-right text-gray-600 py-2.5 whitespace-nowrap">
                    Survey Name
                  </th>
                  <th className="font-medium text-right text-gray-600 py-2.5 whitespace-nowrap">
                    Type
                  </th>
                  {serverData?.allFactors?.map((factor: FactorDataType) => {
                    return (
                      <th
                        key={factor.id}
                        className="font-medium text-right text-gray-600 py-2.5 whitespace-nowrap"
                      >
                        {factor.factorName}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(serverData?.marketSurveyDetails ?? []).map((survey, idx) => {
                  const isSelected = selectedSurveys.some(s => s.id === survey.id);
                  return (
                    <tr
                      key={survey.id}
                      className={clsx('hover:bg-gray-50', isSelected && 'bg-gray-50')}
                    >
                      <td className="text-sm text-right flex items-center justify-center">
                        <button
                          key={idx}
                          onClick={() =>
                            isSelected
                              ? setSelectedSurveys([
                                  ...selectedSurveys.filter(s => s.id !== survey.id),
                                ])
                              : setSelectedSurveys([...selectedSurveys, survey])
                          }
                          className={clsx(
                            'flex flex-row text-left items-center justify-center w-6 h-6 rounded-md transition-colors cursor-pointer',
                            isSelected
                              ? 'border border-primary text-primary transition-all duration-300 ease-in-out'
                              : 'border border-gray-300 text-neutral-400 hover:text-neutral-800',
                          )}
                        >
                          {isSelected && (
                            <Icon
                              name="check"
                              className={clsx('text-sm text-primary hover:text-primary-700')}
                            />
                          )}
                        </button>
                      </td>
                      <td
                        className={clsx(
                          'text-sm text-right',
                          isSelected
                            ? 'text-primary transition-all duration-300 ease-in-out'
                            : 'text-neutral-400 ',
                        )}
                      >
                        {survey.surveyName}
                      </td>
                      <td
                        className={clsx(
                          'text-sm text-right',
                          isSelected
                            ? 'text-primary transition-all duration-300 ease-in-out'
                            : 'text-neutral-400 ',
                        )}
                      >
                        {survey.propertyType}
                      </td>
                      {(serverData?.allFactors ?? []).map(factor => {
                        const factorDetail = survey?.factorData?.find(
                          f => f.factorCode === factor.factorCode,
                        );
                        const factorValue = readFactorValue({
                          dataType: factorDetail.dataType,
                          fieldDecimal: factorDetail.fieldDecimal,
                          value: factorDetail.value,
                        });
                        return (
                          <td
                            key={factorDetail.id}
                            className={clsx(
                              'text-sm text-right w-60',
                              isSelected
                                ? 'text-primary transition-all duration-300 ease-in-out'
                                : 'text-neutral-400 ',
                            )}
                          >
                            <div className="truncate">{factorValue ? factorValue : '-'}</div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
