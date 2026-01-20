import { Dropdown } from '@/shared/components';
import { RHFArrayTable } from './components/RHFArrayTable';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  calculationRows,
  COLLATERAL_TYPE,
  columnGroups,
  columns,
  compColumns,
  DEFAULT_WQSSCORE_ROW,
  FACTORS,
  TEMPLATE,
} from './components/data';
import { WQSDto, type WQSRequestType } from './form';

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
    defaultValues: {
      collateralType: 'land',
      template: '01',
      finalValue: 0,
      roundedFinalValue: 0,
      comparativeData: [
        {
          factor: 'Environment',
          collateral: 'collateral Environment',
          survey1: 'survey 1 - Environment',
          survey2: 'survey 2 - Environment',
          survey3: 'survey 3 - Environment',
        },
        {
          factor: 'Plot Location',
          collateral: 'collateral Plot Location',
          survey1: 'survey 1 - Plot Location',
          survey2: 'survey 2 - Plot Location',
          survey3: 'survey 3 - Plot Location',
        },
      ],
      WQSScores: [
        {
          id: `${FACTORS[0].value}`,
          factorCode: FACTORS[0].value,
          factor: FACTORS[0].label,
          weight: FACTORS[0].weight,
          intensity: FACTORS[0].intensity,
          survey1: 0,
          survey2: 0,
          survey3: 0,
          collateral: 0,
        },
        {
          id: `${FACTORS[1].value}`,
          factorCode: FACTORS[0].value,
          factor: FACTORS[0].label,
          weight: FACTORS[0].weight,
          intensity: FACTORS[0].intensity,
          survey1: 0,
          survey2: 0,
          survey3: 0,
          collateral: 0,
        },
      ],
      WQSCalculations: [
        {
          id: 'survey1',
          offeringPrice: 22750,
          offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
          offeringPriceAdjustmentAmt: 0,
          sellingPrice: undefined,
          sellingPriceMeasurementUnit: undefined,
          sellingDate: undefined,
          sellingPriceAdjustmentYear: undefined,
          numberOfYears: undefined,
        },
        {
          id: 'survey2',
          offeringPrice: 22500,
          offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
          offeringPriceAdjustmentAmt: 0,
          sellingPrice: undefined,
          sellingPriceMeasurementUnit: undefined,
          sellingDate: undefined,
          sellingPriceAdjustmentYear: undefined,
          numberOfYears: undefined,
        },
        {
          id: 'survey3',
          offeringPrice: undefined,
          offeringPriceMeasurementUnit: undefined,
          offeringPriceAdjustmentAmt: undefined,
          sellingPrice: 21500,
          sellingPriceMeasurementUnit: 'Baht/ Sq.Wa',
          sellingDate: undefined,
          sellingPriceAdjustmentYear: 0,
          numberOfYears: 6,
        },
        {
          id: 'collateral',
        },
      ],
    },
    resolver: zodResolver(WQSDto),
  });

  const { handleSubmit, getValues } = methods;

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
            <RHFArrayTable
              name="comparativeData"
              columns={compColumns}
              hasAddButton={true}
              hasFooter={false}
              canEdit={false}
            />
          </div>
          <div className="border border-neutral-300 rounded-lg overflow-clip">
            <RHFArrayTable
              name="WQSScores"
              columns={columns}
              groups={columnGroups}
              defaultRow={DEFAULT_WQSSCORE_ROW}
              ctx={FACTORS}
            />
            <div className="border-y border-neutral-300 flex justify-center h-14 text-sm items-center">
              {`Scoring Criteria : 1-2 Very low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good`}
            </div>
            <RHFArrayTable
              name="WQSCalculations"
              dataAlignment="vertical"
              rows={calculationRows}
              hasHeader={false}
              hasAddButton={false}
              canEdit={true}
              watch={{ WQSScores: 'WQSScores' }}
            />
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
