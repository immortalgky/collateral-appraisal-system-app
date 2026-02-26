import clsx from 'clsx';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';
import { directComparisonPath } from '@features/pricingAnalysis/adapters/directComparisonFieldPath.ts';

interface DirectComparisonSecondRevisionProps {
  comparativeSurveys: MarketComparableDetailType[];
  collateralType: string;
}

export function DirectComparisonSecondRevision({
  comparativeSurveys = [],
  collateralType,
}: DirectComparisonSecondRevisionProps) {
  /** field paths */
  const {
    /** 2nd revision */
    calculationLandAreaDiff: calculationLandAreaDiffPath,
    calculationLandPrice: calculationLandPricePath,
    calculationLandValueIncreaseDecrease: calculationLandValueIncreaseDecreasePath,
    calculationUsableAreaPrice: calculationUsableAreaPricePath,
    calculationUsableAreaDiff: calculationUsableAreaDiffPath,
    calculationBuildingValueIncreaseDecrease: calculationBuildingValueIncreaseDecreasePath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
  } = directComparisonPath;

  /** styles */
  const bgGradient =
    'after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
  const leftColumnBody =
    'border-b border-gray-300 text-left font-medium text-gray-600 px-3 py-2.5 sticky left-0 z-20 w-[350px] min-w-[350px] max-w-[350px] h-14 whitespace-nowrap';
  const bgGradientLeft =
    'after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full';
  const collateralColumnBody =
    'border-b border-gray-300 text-left font-medium sticky right-[70px] z-25 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap';
  const actionColumnBody =
    'border-b border-gray-300 sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]';
  const surveyStyle = 'px-3 py-2.5 border-b border-r border-gray-300';

  return (
    <>
      <tr>
        <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>2nd Revision</td>
        {comparativeSurveys.map((survey: MarketComparableDetailType) => {
          return <td key={survey.id} className={clsx('bg-gray-200', surveyStyle)}></td>;
        })}
        <td className={clsx('bg-gray-200', collateralColumnBody, bgGradientLeft)}></td>
        <td className={clsx('bg-gray-200', actionColumnBody)}></td>
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
            <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
            <td className={clsx('bg-white', actionColumnBody)}></td>
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center gap-2">
                <span>Land Price</span>
                <div className="flex flex-row justify items-center gap-1">
                  <div className="w-24">
                    <RHFInputCell fieldName={calculationLandPricePath()} inputType="number" />
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
            <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
            <td className={clsx('bg-white', actionColumnBody)}></td>
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
            <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
            <td className={clsx('bg-white', actionColumnBody)}></td>
          </tr>
        </>
      )}
      {(collateralType === 'LB' || collateralType === 'C') && (
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
            <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
            <td className={clsx('bg-white', actionColumnBody)}></td>
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center gap-2">
                <span>Usable area price</span>
                <div className="flex flex-row justify items-center gap-1">
                  <div className="w-24">
                    <RHFInputCell fieldName={calculationUsableAreaPricePath()} inputType="number" />
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
            <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
            <td className={clsx('bg-white', actionColumnBody)}></td>
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
            <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
            <td className={clsx('bg-white', actionColumnBody)}></td>
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
            <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
            <td className={clsx('bg-white', actionColumnBody)}></td>
          </tr>
        </>
      )}
    </>
  );
}
