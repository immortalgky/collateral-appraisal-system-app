import {
  getPropertyTaxAmount,
  getPropertyTaxRate,
  toDecimal,
  toFixed2,
  toNumber,
} from '@features/pricingAnalysis/domain/calculation.ts';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import { ScrollableTableContainer } from '@features/pricingAnalysis/components/ScrollableTableContainer.tsx';
import { useDerivedFields } from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { useMemo } from 'react';
import { type UseFormGetValues } from 'react-hook-form';
import { propertyTaxRanges } from '@/features/pricingAnalysis/data/dcfParameters';

export function MethodParameterBasedOnTierOfPropertyValueModal({
  name,
  properties,
  getOuterFormValues,
  isReadOnly,
}: {
  name: string;
  properties: Record<string, unknown>[];
  getOuterFormValues: UseFormGetValues<any>;
  isReadOnly?: boolean;
}) {
  const landGovPrice = (properties ?? [])
    .filter(p => p.propertyType === 'L' || p.propertyType === 'LSL' || p.propertyType === 'LS')
    .flatMap((p: any) => p.titles ?? [])
    .reduce((sum, curr) => sum + toNumber(curr.governmentPrice ?? 0), 0);

  const buildingGovPrice = (properties ?? [])
    .filter(
      (p: any) => p.propertyType === 'B' || p.propertyType === 'LSB' || p.propertyType === 'LS',
    )
    .flatMap((p: any) => p.depreciationDetails ?? [])
    .filter((d: any) => d.isBuilding)
    .reduce((sum: number, d: any) => sum + toNumber(d.priceAfterDepreciation ?? 0), 0);

  const totalNumberOfYears = toNumber(getOuterFormValues('totalNumberOfYears'));

  const rules = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }, (_, idx) => [
      {
        targetPath: `${name}.propertyTax.landPrices.${idx}`,
        deps: [`${name}.increaseRatePct`, `${name}.increaseRateYrs`, `${name}.startIn`],
        compute: ({ getValues, ctx }) => {
          const increaseYrs = toNumber(getValues(`${name}.increaseRateYrs`));
          const increasePct = toNumber(getValues(`${name}.increaseRatePct`));
          const startIn = toNumber(getValues(`${name}.startIn`));

          if (idx === 0) return ctx.landGovPrice;

          const prevLandGovPrice = toNumber(getValues(`${name}.propertyTax.landPrices.${idx - 1}`));

          const year = idx + 1;

          if (!increaseYrs || increaseYrs <= 0 || !startIn || year < startIn) {
            return prevLandGovPrice;
          }

          const shouldIncrease = year >= startIn && (year - startIn) % increaseYrs === 0;

          return prevLandGovPrice * (1 + (shouldIncrease ? increasePct / 100 : 0));
        },
      },
      {
        targetPath: `${name}.propertyTax.totalPropertyPrice.${idx}`,
        deps: [`${name}.propertyTax.landPrices.${idx}`],
        compute: ({ getValues, ctx }) => {
          const landPrice = toNumber(getValues(`${name}.propertyTax.landPrices.${idx}`));
          return landPrice + toNumber(ctx.buildingGovPrice);
        },
      },
      {
        targetPath: `${name}.propertyTax.totalPropertyTax.${idx}`,
        deps: [`${name}.propertyTax.totalPropertyPrice.${idx}`],
        compute: ({ getValues }) => {
          return toDecimal(
            getPropertyTaxAmount(
              toNumber(getValues(`${name}.propertyTax.totalPropertyPrice.${idx}`)),
            ),
            0,
          );
        },
      },
      {
        targetPath: `${name}.propertyTax.totalPropertyTaxRates.${idx}`,
        deps: [`${name}.propertyTax.totalPropertyPrice.${idx}`],
        compute: ({ getValues }) => {
          return getPropertyTaxRate(
            toNumber(getValues(`${name}.propertyTax.totalPropertyPrice.${idx}`)),
          );
        },
      },
    ]).flat();
  }, [name, totalNumberOfYears, landGovPrice, buildingGovPrice]);
  useDerivedFields({ rules, ctx: { landGovPrice, buildingGovPrice } });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-80'}>Total government land appraisal price</span>
        <div className={'flex flex-row w-44 gap-1.5'}>
          <span className="w-44 text-right">
            {landGovPrice ? Number(landGovPrice).toLocaleString() : 0}
          </span>
          <span>Baht</span>
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-80'}>Total government building appraisal price</span>
        <div className={'flex flex-row w-44 gap-1.5'}>
          <span className="w-44 text-right">
            {buildingGovPrice ? Number(buildingGovPrice).toLocaleString() : 0}
          </span>
          <span>Baht</span>
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-80'}>Government land prices increase by</span>
        <div className="w-44">
          <RHFInputCell
            fieldName={`${name}.increaseRatePct`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
          />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRateYrs`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 0, maxIntegerDigits: 3, allowNegative: false }}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={'w-80'}>Start in</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.startIn`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{
              decimalPlaces: 0,
              maxIntegerDigits: 3,
              maxValue: totalNumberOfYears,
              allowNegative: false,
            }}
          />
        </div>
      </div>

      <div className="border border-gray-300 rounded-xl p-1.5 overflow-auto">
        <ScrollableTableContainer className="flex-1 min-h-0">
          <table className={'table table-xs min-w-max border-separate border-spacing-0'}>
            <thead>
              <tr>
                <th colSpan={4} className="border-b border-gray-300 text-center">
                  Land and Building Tax Rates
                </th>
              </tr>
              <tr>
                <th colSpan={2} rowSpan={1} className="border-b border-r border-gray-300">
                  Estimated Price (Baht)
                </th>
                <th colSpan={1} rowSpan={2} className="border-b border-r border-gray-300">
                  Tax Rate
                </th>
                <th colSpan={1} rowSpan={2} className="border-b border-gray-300">
                  Tax Ceiling (Baht)
                </th>
              </tr>
              <tr>
                <th className="border-b border-gray-300">From</th>
                <th className="border-b border-r border-gray-300">To</th>
              </tr>
            </thead>
            <tbody>
              {propertyTaxRanges.map(t => {
                return (
                  <>
                    <tr>
                      <td className="border-b border-r border-gray-300 px-1.5 py-2 text-right">
                        {t.minValue != undefined || t.minValue != null
                          ? toNumber(t.minValue).toLocaleString()
                          : '-'}
                      </td>
                      <td className="border-b border-r border-gray-300 px-1.5 py-2 text-right">
                        {t.maxValue != undefined || t.maxValue != null
                          ? toNumber(t.maxValue).toLocaleString()
                          : '-'}
                      </td>
                      <td className="border-b border-r border-gray-300 px-1.5 py-2 text-right">
                        {toFixed2(t.taxRate * 100)}
                      </td>
                      <td className="border-b border-gray-300 px-1.5 py-2 text-right">
                        {t.maxValue
                          ? toDecimal((t.maxValue - t.minValue) * t.taxRate, 0).toLocaleString()
                          : '-'}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </ScrollableTableContainer>
      </div>

      <div className="border border-gray-300 rounded-xl p-1.5 overflow-auto">
        <ScrollableTableContainer className="flex-1 min-h-0">
          <table className={'table table-xs min-w-max border-separate border-spacing-0'}>
            <thead>
              <tr>
                <th colSpan={totalNumberOfYears + 1} className="border-b border-gray-300">
                  Land and Building Tax
                </th>
              </tr>
              <tr>
                <th></th>
                {Array.from({ length: totalNumberOfYears }, (_, i) => (
                  <th key={i}>Year {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>(1) Government land prices increase by 10% every 4 years</td>
                {Array.from({ length: totalNumberOfYears }, (_, idx) => (
                  <td key={idx} className="text-right">
                    <RHFInputCell
                      fieldName={`${name}.propertyTax.landPrices.${idx}`}
                      inputType="display"
                      accessor={({ value }) => (
                        <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                      )}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td>(2) Government building prices</td>
                {Array.from({ length: totalNumberOfYears }, (_, idx) => (
                  <td key={idx} className="text-right">
                    <span>{buildingGovPrice ? buildingGovPrice.toLocaleString() : 0}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>(1+2) Total price of government property</td>
                {Array.from({ length: totalNumberOfYears }, (_, idx) => (
                  <td key={idx} className="text-right">
                    <RHFInputCell
                      fieldName={`${name}.propertyTax.totalPropertyPrice.${idx}`}
                      inputType="display"
                      accessor={({ value }) => (
                        <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                      )}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td>Property tax</td>
                {Array.from({ length: totalNumberOfYears }, (_, idx) => (
                  <td key={idx} className="text-right">
                    <div className="flex flex-row justify-between items-center">
                      <RHFInputCell
                        fieldName={`${name}.propertyTax.totalPropertyTax.${idx}`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                        )}
                      />
                      <RHFInputCell
                        fieldName={`${name}.propertyTax.totalPropertyTaxRates.${idx}`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">
                            ({value ? (Number(value) * 100).toLocaleString() : 0} %)
                          </span>
                        )}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </ScrollableTableContainer>
      </div>
    </div>
  );
}
