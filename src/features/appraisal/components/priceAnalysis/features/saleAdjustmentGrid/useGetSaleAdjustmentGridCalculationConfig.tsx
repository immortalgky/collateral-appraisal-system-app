import { Icon } from '@/shared/components';
import type { RHFColumnDef, RHFRowDef } from '../../adapters/rhf-table/builder';
import type { SaleAdjustmentGridTemplate } from '../../data/data';
import { getFactorDesciption } from '../../domain/getFactorDescription';
import { RHFInputCell } from '../../components/table/RHFInputCell';
import { getDesciptions } from '../wqs/WQSSection';

interface useGetSaleAdjustmentGridCalculationConfigProps {
  surveys: Record<string, any>[];
  saleAdjustmentGridQualitatives: Record<string, any>[];
  template: SaleAdjustmentGridTemplate;
  comparativeFactors: Record<string, any>[];
}
export function useGetSaleAdjustmentGridCalculationConfig({
  surveys,
  saleAdjustmentGridQualitatives = [],
  template,
  comparativeFactors,
}: useGetSaleAdjustmentGridCalculationConfigProps) {
  console.log(saleAdjustmentGridQualitatives);
  const saleAdjustmentGridQualitativeColumnConfig: RHFColumnDef<Record<string, any>, any>[] = [
    {
      id: 'factorCode',
      header: 'Factors',
      field: 'factorCode',
      style: {
        headerClassName: 'border-r border-gray-300 w-[300px]',
        bodyClassName: 'border-r border-gray-300 max-w-[300px]',
      },
      render: ({ row, rowIndex, columnIndex, ctx, value, actions, fieldPath }) => {
        return (
          row.rowDef?.header?.({ row, rowIndex, columnIndex, ctx, value, actions, fieldPath }) ?? (
            <>No data</>
          )
        );
      },
    },

    ...surveys.map((survey, index) => {
      return {
        id: survey.id,
        header: `survey ${index}`,
        field: `surveys.${index}.qualitativeLevel`,
        style: {
          headerClassName: 'border-r border-gray-300',
          bodyClassName: 'border-r border-gray-300',
        },
        render: ({ fieldPath, ctx, rowIndex, value }) => {
          return <></>;
        },
      };
    }),

    {
      id: 'collateral',
      header: 'Collateral',
      style: {
        headerClassName: 'border-r border-gray-300',
        bodyClassName: 'border-r border-gray-300',
      },
      render: ({ fieldPath, ctx, rowIndex, value }) => {
        return <></>;
      },
    },

    {
      id: 'action',
      header: '',
      style: {
        headerClassName: 'text-center max-w-[40px] w-[60px]',
        bodyClassName: 'max-w-[40px] max-w-[60px]',
      },
      render: ({ actions: { onRemove }, rowIndex }) => {
        /** last row is add button, so it cannot remove */
        if (
          rowIndex > template.qualitativeFactors.length - 1 &&
          rowIndex !== saleAdjustmentGridQualitatives.length
        ) {
          return (
            <div className="flex w-full justify-center items-center">
              <button
                type="button"
                onClick={() => onRemove(rowIndex)}
                className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                title="Delete"
              >
                <Icon style="solid" name="trash" className="size-3.5" />
              </button>
            </div>
          );
        }
        return <></>;
      },
    },
  ];

  let saleAdjustmentGridQualitativeRowConfig: RHFRowDef<Record<string, any>, any>[] = [
    // eslint-disable-next-line no-unsafe-optional-chaining
    {
      id: 'addRow',
      header: ({ actions: { onAppend } }) => (
        <button
          type="button"
          onClick={() => onAppend({ factorCode: '', qualitativeLevel: [] })}
          className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
        >
          + Add More Factors
        </button>
      ),
    },
  ];

  saleAdjustmentGridQualitativeRowConfig = [
    ...(saleAdjustmentGridQualitatives?.map((f, index) => ({
      id: `factorCode.${index}`,
      header: ({ rowIndex, ctx }) => {
        if (rowIndex >= ctx.template.qualitativeFactors.length) {
          const qualitativeFactors = (ctx.comparativeFactors ?? [])
            .filter(f => !ctx.qualitatives.some(q => q.factorCode === f.factorCode))
            .map(f => ({ label: getDesciptions(f.factorCode) ?? '', value: f.factorCode }));
          const fieldName = `saleAdjustmentGridQualitatives.${index}.factorCode`;
          console.log(qualitativeFactors);
          return (
            <RHFInputCell fieldName={fieldName} inputType="select" options={qualitativeFactors} />
          );
        }
        return (
          <span className="w-full truncate" title={getFactorDesciption(f.factorCode) ?? ''}>
            {getFactorDesciption(f.factorCode)}
          </span>
        );
      },
    })) ?? []),
    ...saleAdjustmentGridQualitativeRowConfig,
  ];

  const saleAdjustmentGridQualitativeColumnGroupConfig: GridGroup[] = [
    {
      id: 'comparative',
      label: <div className="">Comparative Data</div>,
      columnIds: surveys.map(survey => survey.id),
      align: 'center',
      className:
        'border-b border-r border-gray-300 sticky top-0 z-20 h-10 text-center z-30 bg-gray-50',
    },
  ];

  return {
    saleAdjustmentGridQualitativeColumnConfig,
    saleAdjustmentGridQualitativeRowConfig,
    saleAdjustmentGridQualitativeColumnGroupConfig,
  };

  let rowDefs: RowDef[] = [
    {
      id: 'offeringPrice',
      field: 'offeringPrice',
      rowHeader: () => {
        return <span>Offering price</span>;
      },
      render: ({ value }) => {
        return <div>{value}</div>;
      },
    },
    {
      id: 'offeringPriceAdjustmentPct',
      field: 'offeringPriceAdjustmentPct',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return (
          <div className="flex flex-row justify-between items-center">
            <span>Adjustment of offering price</span>
            <span>{'(%)'}</span>
          </div>
        );
      },
      render: ({ value, columnIndex }) => {
        return (
          <div>
            <RHFInputCell
              fieldName={`saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentPct`}
              inputType="number"
            />
          </div>
        );
      },
    },
    {
      id: 'offeringPriceAdjustmentAmt',
      field: 'offeringPriceAdjustmentAmt',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return (
          <div className="flex flex-row justify-between items-center">
            <span>Adjustment of offering price</span>
            <span>{'(Amount)'}</span>
          </div>
        );
      },
      render: ({ value, columnIndex }) => {
        return (
          <div>
            <RHFInputCell
              fieldName={`saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentAmt`}
              inputType="number"
            />
          </div>
        );
      },
    },
    {
      id: 'sellingPrice',
      field: 'sellingPrice',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return <span>Selling price</span>;
      },
      render: ({ value }) => {
        return <div>{value}</div>;
      },
    },
    {
      id: 'numberOfYears',
      field: 'numberOfYears',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return <span>Number of years</span>;
      },
      render: ({ value }) => {
        return <div>{value}</div>;
      },
    },
    {
      id: 'sellingPriceAdjustmentYear',
      field: 'sellingPriceAdjustmentYear',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return (
          <div className="flex flex-row justify-between items-center">
            <span>Adjustment of period</span>
            <span>{'(%)'}</span>
          </div>
        );
      },
      render: ({ value }) => {
        return <div>{value}</div>;
      },
    },
    {
      id: 'cumulativeAdjustedPeriod',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return (
          <div className="flex flex-row justify-between items-center">
            <span>Cumulative of period</span>
            <span>{'(%)'}</span>
          </div>
        );
      },
      render: ({ value }) => {
        return <div>{value}</div>;
      },
    },
    {
      id: 'cumulativeAdjustedPeriod',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return (
          <div className="flex flex-row justify-between items-center">
            <span>Total of initial price</span>
            <span>{'(%)'}</span>
          </div>
        );
      },
      render: ({ value }) => {
        return <div>{value}</div>;
      },
    },
    {
      id: 'adjustedValue',
      field: 'adjustedValue',
      rowHeader: ({ fieldPath, columnItem, columnIndex }) => {
        return <span>Adjusted price</span>;
      },
      render: ({ value }) => {
        return <div>{value}</div>;
      },
    },
  ];

  if (property.collateralType === 'L') {
    rowDefs = [
      ...rowDefs,
      {
        id: 'landAreaOfDeficient',
        rowHeader: () => {
          const measurementUnit = 'Sq. Wa'; // varian base on collateral type => set on method config
          return (
            <div className="flex flex-row justify-between">
              <span>{'Land Area of the deficient - excess'}</span>
              <span>{`(${measurementUnit})`}</span>
            </div>
          );
        },
        render: () => {
          return <div>{"market's land area - property's land area"}</div>;
        },
      },
      {
        id: 'landPrice',
        rowHeader: () => {
          return (
            <div className="flex flex-row justify-between">
              <div>{'Land Area of the deficient - excess'}</div>
              <div>
                <RHFInputCell
                  fieldName={`saleAdjustmentGridCalculations.landPrice`}
                  inputType="number"
                />
                <span>{`Baht/ Sq. Wa`}</span>
              </div>
            </div>
          );
        },
        render: () => {
          return <div>Body</div>;
        },
      },
      {
        id: 'landValueIncreaserDecrease',
        rowHeader: () => {
          return (
            <div className="flex flex-row justify-between">
              <span>{'Land value compensation increase - decrease'}</span>
              <span>{`(Baht)`}</span>
            </div>
          );
        },
        render: () => {
          return <div>Body</div>;
        },
      },
      {
        id: 'usableAreaOfDeficient',
        rowHeader: () => {
          return (
            <div className="flex flex-row justify-between">
              <span>{'Usable area of the deficit - excess'}</span>
              <span>{`(Sq. Meter)`}</span>
            </div>
          );
        },
        render: () => {
          return <div>Body</div>;
        },
      },
      {
        id: 'usableAreaPrice',
        rowHeader: () => {
          return (
            <div className="flex flex-row justify-between">
              <div>{'Usable area price'}</div>
              <div>
                <RHFInputCell
                  fieldName={`saleAdjustmentGridCalculations.landPrice`}
                  inputType="number"
                />
                <span>{`Baht/ Sq. Meter`}</span>
              </div>
            </div>
          );
        },
        render: () => {
          return <div>Body</div>;
        },
      },
      {
        id: 'buildingValueIncreaserDecrease',
        rowHeader: () => {
          return (
            <div className="flex flex-row justify-between">
              <span>{'Building value compensation increase - decrease'}</span>
              <span>{`(Baht)`}</span>
            </div>
          );
        },
        render: () => {
          return <div>Body</div>;
        },
      },
      {
        id: 'totalSecondRevision',
        rowHeader: () => {
          return <div>Total of 2nd Revision</div>;
        },
      },
    ];
  }

  if (saleAdjustmentGridQualitatives) {
    rowDefs = [
      ...rowDefs,
      {
        id: 'adjustedValue',
        rowHeader: () => {
          return <span>Adjusted Value</span>;
        },
        render: () => {
          <></>;
        },
      },
      ...saleAdjustmentGridQualitatives.map((s, index) => ({
        id: s.factorCode, // change to proper Id
        rowHeader: () => {
          // convert factor code to description
          return <span>{getFactorDesciption(s.factorCode)}</span>;
        },
        render: ({ columnIndex }) => {
          return (
            <div>
              <div className="w-[100px]">
                <RHFInputCell
                  fieldName={`saleAdjustmentGridCalculations.${columnIndex}.adjustValues.${index}.factorDiffPct`}
                  inputType="number"
                />
              </div>
              <div>xxxxxxxx Baht</div>
            </div>
          );
        },
      })),
      {
        id: 'adjustedWeight',
        rowHeader: () => {
          return <span>Adjust Weight</span>;
        },
        render: () => {
          <></>;
        },
      },
      {
        id: 'factorDiff', // show both % and value
        rowHeader: () => {
          return <span>Total difference, factors affecting property value</span>;
        },
        render: () => {
          <></>;
        },
      },
      {
        id: 'totalAdjValue',
        field: 'totalAdjValue',
        rowHeader: () => {
          return <span>Total of Adjusted Value</span>;
        },
        render: () => {
          <></>;
        },
      },
    ];
  }

  const adjustedWeight: RowDef[] = [
    {
      id: 'weight',
      field: 'weight',
      rowHeader: () => {
        return <span>Weighting factor for data reliability</span>;
      },
      render: () => {
        return <></>;
      },
    },
    {
      id: 'weightedAdjValue',
      field: 'weightedAdjValue',
      rowHeader: () => {
        return <span>Weighted Adjusted Value</span>;
      },
      render: () => {
        return <></>;
      },
    },
  ];

  const saleAdjustmentGridCalculationConfigurationRows: RowDef[] = [...rowDefs, ...adjustedWeight];

  const columnDefs: ColumDef[] = [
    {
      id: 'column1',
      header: <div></div>,
      style: {
        headerClassName: 'border-r border-gray-300 sticky left-0 z-30 bg-gray-50',
        bodyClassName: 'border-r border-gray-300 sticky left-0 z-30 bg-white',
      },
      render: ({ fieldPath, col, colIndex, row }) => {
        // console.log(row);
        console.log(row);
        return row.rowDef.rowHeader({ fieldPath, columnIndex: colIndex, columnItem: col });
      },
    },
    ...surveys.map((survey, index) => ({
      id: survey.id,
      header: <div>{`Survey ${index + 1}`}</div>,
      style: {
        headerClassName: 'border-r border-gray-300',
        bodyClassName: 'max-w-[300px] border-r border-gray-300',
      },
      render: ({ row, columnIndex }) => {
        console.log(columnIndex);
        const rowItems = row.value[columnIndex - 1] ?? [];
        const items = rowItems.value ?? {};
        const item = items[row.rowDef.field] ?? '';
        if (!row.rowDef) return <>No row def</>;
        if (!row.rowDef.render) return <>No render</>;
        return (
          <div className="max-w-[200px] truncate">
            {row.rowDef.render({ value: item, columnIndex: columnIndex })}
          </div>
        );
      },
    })),
    {
      id: 'collateral',
      render: () => {
        // console.log(row);
        return <></>;
      },
    },
  ];
}
