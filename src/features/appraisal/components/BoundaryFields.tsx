import clsx from 'clsx';
import { get, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormReadOnly } from '@/shared/components/form/context';
import { FIELD, NumCell, NUM, TD, TH } from './tables/denseTable';

const BOUNDARY_ROWS = [
  { key: 'north', area: 'northAdjacentArea', length: 'northBoundaryLength' },
  { key: 'south', area: 'southAdjacentArea', length: 'southBoundaryLength' },
  { key: 'east', area: 'eastAdjacentArea', length: 'eastBoundaryLength' },
  { key: 'west', area: 'westAdjacentArea', length: 'westBoundaryLength' },
] as const;

interface BoundaryFieldsProps {
  readOnly?: boolean;
}

/**
 * North/South/East/West boundaries — what each side adjoins (text) and its length (number) — as
 * the same dense grey table the building and title tables use, under a "Size and Boundary" label.
 *
 * Must be rendered inside a react-hook-form <FormProvider>.
 * Pass readOnly={true} to disable all inputs (used outside the appraisal route tree).
 */
const BoundaryFields = ({ readOnly: readOnlyProp }: BoundaryFieldsProps) => {
  const { t } = useTranslation('appraisal');
  const { register, formState } = useFormContext();
  const readOnly = useFormReadOnly() || !!readOnlyProp;
  const areas = useWatch({ name: BOUNDARY_ROWS.map(r => r.area) }) as (string | null)[];

  return (
    <div className="col-span-12">
      <div className="cas-labelled-table">
        <div className="cas-table-label">{t('forms.land.sectionTitleBoundary')}</div>
        <div className="cas-table-card min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full border-collapse text-[0.875rem] leading-tight tabular-nums">
            <thead className="bg-[#f8fafa] text-left text-[0.8125rem] font-medium text-[#55636f]">
              <tr>
                <th className={clsx(TH, 'w-[110px]')}>{t('boundaryTable.direction')}</th>
                <th className={TH}>{t('boundaryTable.adjacent')}</th>
                <th className={clsx(TH, 'w-[170px] text-right')}>{t('boundaryTable.length')}</th>
              </tr>
            </thead>
            <tbody className="text-[#1f2937]">
              {BOUNDARY_ROWS.map((row, i) => {
                const areaError = get(formState.errors, row.area)?.message as string | undefined;
                const lengthError = !!get(formState.errors, row.length);
                return (
                  <tr key={row.key}>
                    <td className={clsx(TD, 'font-medium')}>{t(`titleEntry.deed.${row.key}`)}</td>
                    <td className={TD}>
                      {readOnly ? (
                        areas[i]
                      ) : (
                        <input
                          {...register(row.area)}
                          maxLength={200}
                          title={areaError}
                          className={clsx(FIELD, areaError && 'border-red-400!')}
                        />
                      )}
                    </td>
                    <td className={NUM}>
                      <NumCell
                        name={row.length}
                        readOnly={readOnly}
                        maxInt={5}
                        invalid={lengthError}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BoundaryFields;
