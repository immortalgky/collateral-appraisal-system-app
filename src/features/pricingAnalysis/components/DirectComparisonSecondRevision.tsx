import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';
import { directComparisonPath } from '@features/pricingAnalysis/adapters/directComparisonFieldPath.ts';

interface DirectComparisonSecondRevisionProps {
  comparativeSurveys: MarketComparableDetailType[];
  /** Both come from deriveSecondRevisionVisibility — a group can have land, buildings, or both. */
  showLand: boolean;
  showBuilding: boolean;
}

export function DirectComparisonSecondRevision({
  comparativeSurveys = [],
  showLand,
  showBuilding,
}: DirectComparisonSecondRevisionProps) {
  const { t } = useTranslation('pricingAnalysis');
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

  /** styles — Factor + Collateral sticky, contiguous from the left edge (same reorder
   * as WQSScoringSection.tsx; Collateral moved from trailing to right after Factor). */
  // User asked to remove the right-edge shadow ("เอาเงาด้านขวาออกให้ด้วย") — same fix as
  // DirectComparisonScoringSection.tsx, whose rows this component renders alongside.
  const bgGradient = '';
  // Widths/positions must track DirectComparisonScoringSection.tsx's own constants —
  // these rows render straight into that file's <table>, and that file moved to
  // Factor 190px / Collateral 150px (single column) / markets split into ระดับ 72px +
  // ปรับ % 82px. This file was still at the pre-restructure 250/200/single-column
  // values, which would have misaligned every column after Factor.
  // The ปัจจัย column is content-sized in the parent now, and these rows carry some of its
  // longest labels — so no width here either. A max-w-[190px] left behind would have
  // capped the very column the parent is trying to grow, since auto layout takes every
  // cell in the column into account, not just the header's.
  // Every border below is SIDE-SPECIFIC, copied from DirectComparisonScoringSection's
  // own constants rather than respelled here — see the note above that file's
  // `colDivider`. These <tr>s render into that file's <table>, so a blanket
  // `border-gray-300` put this block's dividers at #d1d5db against the parent's
  // #eef2f2: the reported "2nd revision เส้น border ไม่บางเท่าเพื่อน".
  const colDivider = 'border-r border-r-[#eef2f2]';
  const leftColumnBody = clsx(
    'border-b border-b-gray-300 text-left font-medium text-gray-600 px-[8px] py-0 sticky left-0 z-20 h-[26px] whitespace-nowrap',
    colDivider,
  );
  // `--pa-factor-w` is set on DirectComparisonScoringSection's <table>, which is the table
  // these rows render into — custom properties inherit, so this tracks the measured width
  // with no prop. The 190px fallback only applies if these rows are ever mounted outside
  // that table.
  const collateralColumnBody = clsx(
    'border-b border-b-gray-300 text-left font-medium px-[8px] py-0 sticky left-[var(--pa-factor-w,190px)] z-20 w-[150px] min-w-[150px] max-w-[150px] h-[26px] whitespace-nowrap',
    // This frozen column's right edge is a box-shadow, not a border. `.pa-sticky-edge`
    // is injected by ScrollableTableContainer (the parent table passes `edgeShadow`)
    // and is the mechanism THIS file keys off, where the parent's own cells use the
    // equivalent `group-data-[scrolled=true]:` utility — see the note at
    // ScrollableTableContainer.tsx:255 before collapsing the two. The `border-r
    // border-gray-300` that used to sit here drew a second, much darker hairline on
    // top of that shadow, which is why the vertical dividers read worst of all.
    'pa-sticky-edge',
  );
  // Single-value filler spanning both of a market's ระดับ/ปรับ % sub-columns (colSpan=2
  // on every usage below) — this file never puts per-market content in two separate
  // controls, so there's nothing to split, just to widen.
  const surveyStyle = clsx('px-[8px] py-0 border-b border-b-gray-300', colDivider);

  return (
    /* No title row here any more: the parent now renders a collapsible band header
       carrying `secondRevision.title` right above these rows (mock:1530 band('rev2')),
       so keeping this gray row would repeat the same words twice in a row. */
    <>
      {showLand && (
        <>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>{t('directComparison.secondRevision.landAreaDiff')}</span>
                <span>{t('directComparison.secondRevision.sqWaUnit')}</span>
              </div>
            </td>
            <td className={clsx('bg-white', collateralColumnBody)}></td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle)} colSpan={2}>
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
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center gap-2">
                <span>{t('directComparison.secondRevision.landPriceLabel')}</span>
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
                  <span>{t('directComparison.secondRevision.bahtPerSqWa')}</span>
                </div>
              </div>
            </td>
            <td className={clsx('bg-white', collateralColumnBody)}></td>
            {comparativeSurveys.map((survey: MarketComparableDetailType) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')} colSpan={2}>
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
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>{t('directComparison.secondRevision.landValueChange')}</span>
                <span>{t('directComparison.secondRevision.bahtUnit')}</span>
              </div>
            </td>
            <td className={clsx('bg-white', collateralColumnBody)}></td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')} colSpan={2}>
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
          </tr>
        </>
      )}
      {showBuilding && (
        <>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>{t('directComparison.secondRevision.usableAreaDiff')}</span>
                <span>{t('directComparison.secondRevision.sqmUnit')}</span>
              </div>
            </td>
            <td className={clsx('bg-white', collateralColumnBody)}></td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')} colSpan={2}>
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
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center gap-2">
                <span>{t('directComparison.secondRevision.usableAreaPriceLabel')}</span>
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
                  <span>{t('directComparison.secondRevision.bahtPerSqm')}</span>
                </div>
              </div>
            </td>
            <td className={clsx('bg-white', collateralColumnBody)}></td>
            {comparativeSurveys.map((survey: MarketComparableDetailType) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')} colSpan={2}>
                  <RHFInputCell
                    fieldName={calculationUsableAreaPricePath()}
                    inputType="display"
                    accessor={({ value }) => (value ? value.toLocaleString() : '')}
                  />
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
              <div className="flex flex-row justify-between items-center">
                <span>{t('directComparison.secondRevision.buildingValueChange')}</span>
                <span>{t('directComparison.secondRevision.bahtUnit')}</span>
              </div>
            </td>
            <td className={clsx('bg-white', collateralColumnBody)}></td>
            {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
              return (
                <td key={survey.id} className={clsx(surveyStyle, 'text-right')} colSpan={2}>
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
          </tr>
        </>
      )}
      {/* The total is computed whether or not either half is visible, so it sits outside both. */}
      <tr>
        {/* "รวมหลังปรับครั้งที่ 2" is a total, so it carries the same font-semibold as
            every other total row in this table — user: "พวกแถว total ทั้งหลายให้ใช้ฟ้อน
            หน้ากว่าตรงอื่น". These rows render into the parent's table, so the weight has
            to be spelled here rather than inherited from it. */}
        <td className={clsx('bg-white font-semibold', leftColumnBody, bgGradient)}>
          <span>{t('directComparison.secondRevision.totalSecondRevision')}</span>
        </td>
        <td className={clsx('bg-white', collateralColumnBody)}></td>
        {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
          return (
            <td
              key={survey.id}
              className={clsx(surveyStyle, 'text-right font-semibold')}
              colSpan={2}
            >
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
      </tr>
    </>
  );
}
