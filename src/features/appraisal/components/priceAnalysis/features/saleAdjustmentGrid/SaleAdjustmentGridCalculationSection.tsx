import { RHFHorizontalArrayTable } from '../../adapters/rhf-table/RHFArrayTable';
import type { RHFHorizontalColumn } from '../../adapters/rhf-table/spec';
import { MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND } from '../../data/comparativeData';

interface SaleAdjustmentGridCalculationSectionProps {
  property: Record<string, any>;
  surveys: Record<string, any>[];
}

export const SaleAdjustmentGridCalculationSection = ({
  property,
  surveys = MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND,
}: SaleAdjustmentGridCalculationSectionProps) => {
  const saleAdjustmentGridQualitativesColumns: RHFHorizontalColumn<Record<string, any>, any>[] = [
    {
      id: 'factorCode',
      header: 'Factors',
      field: 'factorCode',
      style: {},
      render: ({ fieldPath, ctx, rowIndex, value }) => {
        return <>Test</>;
      },
    },

    ...surveys.map((survey, index) => {
      return {
        id: survey.id,
        header: `survey ${index}`,
        field: `surveys.[${index}].adjustPercent`,
        style: {},
        render: ({ fieldPath, ctx, rowIndex, value }) => {
          return <></>;
        },
      };
    }),

    {
      id: 'collateral',
      header: 'Collateral',
      style: {},
      render: ({ fieldPath, ctx, rowIndex, value }) => {
        return <></>;
      },
    },
  ];

  const saleAdjustmentGridQualitativesColumnGroups: GridGroup[] = [
    {
      id: 'comparative',
      label: <div className="">Comparative Data</div>,
      columnIds: [],
      align: 'center',
      className:
        'border-b border-r border-neutral-300 sticky top-0 z-20 h-10 text-center sticky left-[300px] z-30 bg-gray-50',
    },
  ];

  return (
    <div>
      <RHFHorizontalArrayTable
        name={'saleAdjustmentGridQualitatives'}
        columns={saleAdjustmentGridQualitativesColumns}
        groups={saleAdjustmentGridQualitativesColumnGroups}
        defaultRow={{ factorCode: '', surveys: [] }}
        ctx={null}
      />
    </div>
  );
};
