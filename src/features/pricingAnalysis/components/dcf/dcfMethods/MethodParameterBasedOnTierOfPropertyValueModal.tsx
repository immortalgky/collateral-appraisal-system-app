import {
  getPropertyTaxAmount,
  getPropertyTaxRate,
  toNumber,
} from '@features/pricingAnalysis/domain/calculation.ts';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import { ScrollableTableContainer } from '@features/pricingAnalysis/components/ScrollableTableContainer.tsx';
import { useDerivedFields } from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { useMemo } from 'react';
import type { UseFormGetValues } from 'react-hook-form';
import type { FormValues } from '@/features/appraisal/components/tables/bType';

export function MethodParameterBasedOnTierOfPropertyValueModal({
  name,
  properties,
  getOuterFormValues,
}: {
  name: string;
  properties: Record<string, unknown>[];
  getOuterFormValues: UseFormGetValues<FormValues>;
}) {
  const landGovPrice = (properties ?? [])
    .filter(p => p.propertyType === 'L')
    .flatMap((p: any) => p.titles ?? [])
    .reduce((sum, curr) => sum + toNumber(curr.governmentPrice ?? 0), 0);

  const buildingGovPrice = (properties ?? [])
    .filter((p: any) => p.propertyType === 'B')
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
          return getPropertyTaxAmount(
            toNumber(getValues(`${name}.propertyTax.totalPropertyPrice.${idx}`)),
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
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-64'}>Total government land appraisal price</span>
        <div className={'w-44'}>
          <span>{landGovPrice}</span>
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-64'}>Total government building appraisal price</span>
        <div className={'w-44'}>
          <span>{buildingGovPrice}</span>
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-64'}>Government land prices increase by</span>
        <div className="w-24">
          <RHFInputCell fieldName={`${name}.increaseRatePct`} inputType={'number'} />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell fieldName={`${name}.increaseRateYrs`} inputType={'number'} />
        </div>
        <span className={''}>year(s)</span>
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={'w-64'}>Start in</span>
        <div className={'w-24'}>
          <RHFInputCell fieldName={`${name}.startIn`} inputType={'number'} />
        </div>
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
                  <th>Year {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>(1) Government land prices increase by 10% every 4 years</td>
                {Array.from({ length: totalNumberOfYears }, (_, idx) => (
                  <td key={idx}>
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
                  <td key={idx}>
                    <span>{buildingGovPrice}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>(1+2) Total price of government property</td>
                {Array.from({ length: totalNumberOfYears }, (_, idx) => (
                  <td key={idx}>
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
                  <td key={idx}>
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
                            ({value ? value.toLocaleString() : 0} %)
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
