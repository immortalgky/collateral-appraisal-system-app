import { Dropdown, Icon } from '@/shared/components';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { COLLATERAL_TYPE, TEMPLATE, WQS_LAND } from './data/data';
import { WQSDto, type WQSRequestType } from './form';
import { AdjustFinalValueSection } from './AdjustFinalValueSection';
import { ComparativeSection } from './ComparativeSection';
import { CalculationSection } from './CalculationSection';
import { useEffect, useState } from 'react';
import { MOC_COMPARATIVE_DATA_LAND } from './data/comparativeData';

export const WQSSection = () => {
  /**
   * Initial
   * (1) get property information in the group
   * (2) get market survey information in application
   * When we should map between market survey, wqs template and property?
   * => default collateral type, template => generate => query factors in template
   * =>
   */

  /**
   * Comparative
   */

  /**
   * Calculation
   */

  // const methods = useForm<WQSRequestType>({
  //   defaultValues: {
  //     comparativeData: [...compRows],
  //     WQSMarketSurveys: [{ WQSScores: [] }],
  //     WQSCalculation: [...calculation],
  //   },
  //   resolver: zodResolver(WQSDto),
  // });

  const methods = useForm<WQSRequestType>({
    defaultValues: WQS_LAND,
    resolver: zodResolver(WQSDto),
  });

  const { handleSubmit, getValues, reset } = methods;

  const [comparativeData, setComparativeData] = useState<any>();

  useEffect(() => {
    setTimeout(() => {
      setComparativeData(MOC_COMPARATIVE_DATA_LAND);
    }, 500); // 500ms minimum loading time
  }, [comparativeData]);

  const onSubmit = data => {
    console.log(getValues());
  };

  const onDraft = () => {
    console.log(getValues());
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 w-full min-h-0 mt-2">
          <div className="flex flex-row gap-2">
            <div className="text-2xl">
              <Icon name="scale-balanced"></Icon>
            </div>
            <span className="text-2xl">{'Weighted Quality Scores (WQS)'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Pricing Analysis Template</span>
            <div>
              <Dropdown label="Collateral Type" options={COLLATERAL_TYPE} />
            </div>
            <div>
              <Dropdown label="Template" options={TEMPLATE} />
            </div>
            <div>
              <button
                type="button"
                onClick={() => console.log('Generate!')}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Generate
              </button>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => console.log('Generate!')}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Add Comparative Data
            </button>
          </div>
          <div>
            <ComparativeSection comparativeData={comparativeData} />
          </div>
          <div>
            <CalculationSection />
          </div>
          <div>
            <AdjustFinalValueSection />
          </div>
          <div>
            <button type="submit">Submit</button>
          </div>
          <div>
            <button type="button" onClick={() => onDraft()}>
              Draft
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
