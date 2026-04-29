import clsx from 'clsx';
import type { DCFSection, MethodProportionWrapper } from '../../../types/dcf';
import { RHFInputCell } from '../../table/RHFInputCell';
import { getDCFFilteredAssumptions } from '@/features/pricingAnalysis/domain/getDCFFilteredAssumptions';
import { buildMethodProportionOptions } from '@/features/pricingAnalysis/domain/dcf/buildMethodProportionOptions';
import { useFormContext } from 'react-hook-form';

interface MethodProportionProps {
  name: string;
  expanded: boolean;
  method: MethodProportionWrapper;
  assumptionType: string;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodProportion({
  name,
  expanded,
  method,
  assumptionType,
  baseStyles,
  isReadOnly,
}: MethodProportionProps) {
  const { getValues } = useFormContext();
  const sections = (getValues('sections') ?? []).filter(
    (s: DCFSection) => s.identifier !== 'empty',
  );

  // guard againt missing assumptions in case the assumptionType has been removed or changed
  if (!assumptionType) return null;

  const assumptions = getDCFFilteredAssumptions(
    getValues,
    a => Boolean(a?.assumptionType) && assumptionType !== a.assumptionType,
  );

  const refTargetOptions = buildMethodProportionOptions({
    sections,
    assumptions,
  });

  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row gap-3 items-center justify-between">
                <span>Total</span>
                <div className="flex flex-row gap-1.5 items-center">
                  <div className="w-20">
                    <RHFInputCell
                      fieldName={`${name}.detail.proportionPct`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{ decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
                    />
                  </div>
                  <span>% of</span>
                  <div className="w-72">
                    <RHFInputCell
                      fieldName={`${name}.detail.refTarget.clientId`}
                      inputType={'select'}
                      options={refTargetOptions}
                      dropdown={{ showValue: false }}
                    />
                  </div>
                </div>
              </div>
            </td>
            {(method.totalMethodValues ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
