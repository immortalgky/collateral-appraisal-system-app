import clsx from 'clsx';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import { saleGridFieldPath } from '../adapters/saleAdjustmentGridFieldPath';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';

interface SaleAdjustmentGridSecondRevisionProps {
  comparativeSurveys: MarketComparableDetailType[];
  collateralType: string;
}
export function SaleAdjustmentGridSecondRevision({
  comparativeSurveys = [],
  collateralType,
}: SaleAdjustmentGridSecondRevisionProps) {
  /** field paths */
  const {
    calculationLandAreaDiff: calculationLandAreaDiffPath,
    calculationLandPrice: calculationLandPricePath,
    calculationLandValueIncreaseDecrease: calculationLandValueIncreaseDecreasePath,
    calculationUsableAreaPrice: calculationUsableAreaPricePath,
    calculationUsableAreaDiff: calculationUsableAreaDiffPath,
    calculationBuildingValueIncreaseDecrease: calculationBuildingValueIncreaseDecreasePath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
  } = saleGridFieldPath;

  /** styles */
  const bgGradient =
    'after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
  const leftColumnBody =
    'border-b border-gray-300 text-left font-medium text-gray-600 px-3 py-1.5 sticky left-0 z-20 w-[250px] min-w-[250px] max-w-[250px] h-10 whitespace-nowrap';
  const collateralColumnBody =
    'border-b border-r border-gray-300 text-left font-medium px-3 py-1.5 w-[200px] min-w-[200px] max-w-[200px] whitespace-nowrap';
  const surveyStyle = 'px-3 py-1.5 border-b border-r border-gray-300';

  return (
    <>
      <tr>
        <td className={clsx('bg-gray-100', leftColumnBody, bgGradient)}>2nd Revision</td>
        {comparativeSurveys.map((survey: MarketComparableDetailType) => {
          return <td key={survey.id} className={clsx('bg-gray-100', surveyStyle)}></td>;
        })}
        <td className={clsx('bg-gray-100', collateralColumnBody)}></td>
      </tr>
      {collateralType === 'LB' && (
        <>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>Land Area of the deficient - excess</span>
                <span>{'(Sq. Wa)'}</span>
              </div>
            </td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle)}>
                  <div className="flex flex-row justify-end">
                    <RHFInputCell
                      fieldName={calculationLandAreaDiffPath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </div>
                </td>
              );
            })}
            <td className={clsx('bg-white', collateralColumnBody)}></td>
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center gap-2">
                <span>Land Price</span>
                <div className="flex flex-row justify items-center gap-1">
                  <div className="w-24">
                    <RHFInputCell
                      fieldName={calculationLandPricePath()}
                      inputType="number"
                      number={{
                        decimalPlaces: 2,
                        maxIntegerDigits: 15,
                        maxValue: 999_999_999_999_999.0,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>Baht/ Sq. Wa</span>
                </div>
              </div>
            </td>
            {comparativeSurveys.map((survey: MarketComparableDetailType) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                  <RHFInputCell
                    fieldName={calculationLandPricePath()}
                    inputType="display"
                    accessor={({ value }) => {
                      return value ? value.toLocaleString() : '';
                    }}
                  />
                </td>
              );
            })}
            <td className={clsx('bg-white', collateralColumnBody)}></td>
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>Land value compensation increase - decrease</span>
                <span>{'(Baht)'}</span>
              </div>
            </td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                  <RHFInputCell
                    fieldName={calculationLandValueIncreaseDecreasePath({ column: columnIndex })}
                    inputType="display"
                    accessor={({ value }) => {
                      return value ? value.toLocaleString() : '';
                    }}
                  />
                </td>
              );
            })}
            <td className={clsx('bg-white', collateralColumnBody)}></td>
          </tr>
        </>
      )}
      {(collateralType === 'LB' || collateralType === 'U') && (
        <>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>Usable area of the deficit - excess</span>
                <span>{'(Sq. Meter)'}</span>
              </div>
            </td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                  <RHFInputCell
                    fieldName={calculationUsableAreaDiffPath({ column: columnIndex })}
                    inputType="display"
                    accessor={({ value }) => {
                      return value ? value.toLocaleString() : value;
                    }}
                  />
                </td>
              );
            })}
            <td className={clsx('bg-white', collateralColumnBody)}></td>
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center gap-2">
                <span>Usable area price</span>
                <div className="flex flex-row justify items-center gap-1">
                  <div className="w-24">
                    <RHFInputCell
                      fieldName={calculationUsableAreaPricePath()}
                      inputType="number"
                      number={{
                        decimalPlaces: 2,
                        maxIntegerDigits: 15,
                        maxValue: 999_999_999_999_999.0,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>Baht/ Sq. Meter</span>
                </div>
              </div>
            </td>
            {comparativeSurveys.map((survey: MarketComparableDetailType) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                  <RHFInputCell
                    fieldName={`usableAreaPrice`}
                    inputType="display"
                    accessor={({ value }) => (value ? value.toLocaleString() : '')}
                  />
                </td>
              );
            })}
            <td className={clsx('bg-white', collateralColumnBody)}></td>
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>Building value compensation increase - decrease</span>
                <span>{'(Baht)'}</span>
              </div>
            </td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                  <RHFInputCell
                    fieldName={calculationBuildingValueIncreaseDecreasePath({
                      column: columnIndex,
                    })}
                    inputType="display"
                    accessor={({ value }) => {
                      return value ? value.toLocaleString() : '';
                    }}
                  />
                </td>
              );
            })}
            <td className={clsx('bg-white', collateralColumnBody)}></td>
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <span>Total of 2nd Revision</span>
            </td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                  <RHFInputCell
                    fieldName={calculationTotalSecondRevisionPath({ column: columnIndex })}
                    inputType="display"
                    accessor={({ value }) => {
                      return value ? value.toLocaleString() : '';
                    }}
                  />
                </td>
              );
            })}
            <td className={clsx('bg-white', collateralColumnBody)}></td>
          </tr>
        </>
      )}
    </>
  );
}
