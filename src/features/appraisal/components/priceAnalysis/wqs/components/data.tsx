import { NumberInput } from '@/shared/components';
import type { ColumnDef, ColumnGroup, RHFColumn } from './types';
import { RHFInputCell } from './RHFInputCell';

export const columns: RHFColumn[] = [
  {
    id: 'factor',
    header: <div>Factor</div>,
    name: 'factor',
    rhfRenderCell: {
      inputType: 'select',
      options: [
        { label: 'Environment', value: 'environment' },
        { label: 'Plot Location', value: 'plotlocation' },
      ],
    },
  },
  {
    id: 'weight',
    header: <div>Weight</div>,
    name: 'weight',
    rhfRenderCell: { inputType: 'number' },

    renderFooter: ({ fieldName, rows, ctx, columnIndex }) => {
      const totalWeight = rows.reduce((acc, curr) => {
        return acc + curr[columnIndex];
      }, 0);
      return (
        <div>
          <span>{`${totalWeight}`}</span>
        </div>
      );
    },
  },
  {
    id: 'intensity',
    header: <div>Intensity</div>,
    name: 'intensity',
    rhfRenderCell: { inputType: 'number' },
    align: 'right',

    renderFooter: ({ rows, ctx, columnIndex }) => {
      const totalIntensity = rows.reduce((acc, curr) => {
        return acc + curr[columnIndex];
      }, 0);
      return (
        <div>
          <span>{`${totalIntensity}`}</span>
        </div>
      );
    },
  },
  {
    id: 'score',
    header: <div>Score</div>,
    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => (
      <span>{`${row['intensity'] * row['weight']}`}</span>
    ),
    align: 'right',
  },
  {
    id: 'survey1',
    name: 'survey1',
    header: (
      <div className="flex flex-col">
        <div className="flex justify-center items-center truncate">
          <span>Survey 1</span>
        </div>
        <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
          <span className="text-left">Score</span>
          <span className="text-right">Weighted Score</span>
        </div>
      </div>
    ),

    accessor: (row, rowIndex, ctx) => ({
      score: row['survey1'],
    }),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            <span>{`${row['weight'] * value.score}`}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'survey2',
    name: 'survey2',
    header: (
      <div className="flex flex-col">
        <div className="flex justify-center items-center truncate">
          <span>Survey 2</span>
        </div>
        <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
          <span className="text-left">Score</span>
          <span className="text-right">Weighted Score</span>
        </div>
      </div>
    ),

    accessor: (row, rowIndex, ctx) => ({
      score: row['survey2'],
    }),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            <span>{`${row['weight'] * value.score}`}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'survey3',
    name: 'survey3',
    header: (
      <div className="flex flex-col">
        <div className="flex justify-center items-center truncate">
          <span>Survey 3</span>
        </div>
        <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
          <span className="text-left">Score</span>
          <span className="text-right">Weighted Score</span>
        </div>
      </div>
    ),

    accessor: (row, rowIndex, ctx) => ({
      score: row['survey3'],
    }),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            <span>{`${row['weight'] * value.score}`}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'collateral',
    name: 'collateral',
    header: (
      <div className="flex flex-col w-full h-full">
        <div className="flex justify-center items-start w-full h-full">
          <span>collateral</span>
        </div>
        <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
          <span className="text-left">Score</span>
          <span className="text-right">Weighted Score</span>
        </div>
      </div>
    ),

    accessor: (row, rowIndex, ctx) => ({
      score: row['collateral'],
    }),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            <span>{`${row['weight'] * value.score}`}</span>
          </div>
        </div>
      );
    },
  },
];

export const columnGroups: ColumnGroup[] = [
  {
    id: 'group 1',
    label: <span>Calculation</span>,
    columns: ['intensity', 'score'],
    align: 'center',
  },
  {
    id: 'group 2',
    label: <span>Comparative Data</span>,
    columns: ['survey1', 'survey2', 'survey3'],
    align: 'center',
  },
];

// default factor which initial from template
export const rows: Record<string, any>[] = [
  {
    factor: '',
    weight: 1,
    intensity: 10,
    survey1: 0,
    survey2: 0,
    survey3: 0,
    collateral: 0,
  },
];

export const compRows: Record<string, any>[] = [
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
];

export const compColumns: ColumnDef[] = [
  {
    id: 'factor',
    header: <div>Factor</div>,
    name: 'factor',
    accessor: (row, rowIndex, ctx) => {
      console.log(row);
    },
    rhfRenderCell: {
      inputType: 'display',
    },
  },
  {
    id: 'collateral',
    header: <div>collateral</div>,
    name: 'collateral',
    rhfRenderCell: {
      inputType: 'display',
    },
  },
  {
    id: 'survey1',
    header: <div>survey 1</div>,
    name: 'survey1',
    rhfRenderCell: {
      inputType: 'display',
    },
  },
  {
    id: 'survey2',
    header: <div>survey 2</div>,
    name: 'survey2',
    rhfRenderCell: {
      inputType: 'display',
    },
  },
  {
    id: 'survey3',
    header: <div>survey 3</div>,
    name: 'survey3',
    rhfRenderCell: {
      inputType: 'display',
    },
  },
];

export const calculation: Record<string, any>[] = [
  {
    id: 'survey1',
    offeringPrice: 0,
    offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
    offeringPriceAdjustmentAmt: 0,
    sellingPrice: null,
    sellingPriceMeasurementUnit: null,
    sellingDate: null,
    sellingPriceAdjustmentYear: null,
    numberOfYears: null,
  },
  {
    id: 'survey2',
    offeringPrice: 0,
    offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
    offeringPriceAdjustmentAmt: 0,
    sellingPrice: null,
    sellingPriceMeasurementUnit: null,
    sellingDate: null,
    sellingPriceAdjustmentYear: null,
    numberOfYears: null,
  },
  {
    id: 'survey3',
    offeringPrice: null,
    offeringPriceMeasurementUnit: null,
    offeringPriceAdjustmentAmt: null,
    sellingPrice: 0,
    sellingPriceMeasurementUnit: 'Baht/ Sq.Wa',
    sellingDate: 0,
    sellingPriceAdjustmentYear: 0,
    numberOfYears: 0,
  },
];

export const calculationRows: ColumnDef[] = [
  {
    id: 'offeringPrice',
    header: <div>Offering Price</div>,
    name: 'offeringPrice',
    accessor: (row, rowIndex, ctx) => {
      return Object.keys(row)[rowIndex + 1];
    },
    renderCell: ({ fieldName, row, rows, rowIndex, value, ctx }) => {
      // console.log(fieldName, value);
      return <div>{`${value}`}</div>;
    },
  },
  {
    id: 'offeringPriceAdjustmentPct',
    header: <div>Adjustment of Offer Price</div>,
    name: 'offeringPriceAdjustmentPct',
    accessor: (row, rowIndex, ctx) => {
      return row['offeringPrice'];
    },
    renderCell: ({ fieldName, row, rows, rowIndex, value, ctx }) => {
      return <div>{`${value}`}</div>;
    },
  },
  {
    id: 'offeringPriceAdjustmentAmt',
    header: <div>Adjustment of Offer Price</div>,
    name: 'offeringPriceAdjustmentAmt',
    accessor: (row, rowIndex, ctx) => {
      return row['offeringPrice'];
    },
    renderCell: ({ fieldName, row, rows, rowIndex, value, ctx }) => {
      return <div>{`${value}`}</div>;
    },
  },
  {
    id: 'sellingPrice',
    header: <div>Selling Price</div>,
    name: 'sellingPrice',
    accessor: (row, rowIndex, ctx) => {
      return row['offeringPrice'];
    },
    renderCell: ({ fieldName, row, rows, rowIndex, value, ctx }) => {
      return <div>{`${value}`}</div>;
    },
  },
  {
    id: 'numberOfYears',
    header: <div>Number of Years</div>,
    name: 'numberOfYears',
    accessor: (row, rowIndex, ctx) => {
      return row['offeringPrice'];
    },
    renderCell: ({ fieldName, row, rows, rowIndex, value, ctx }) => {
      return <div>{`${value}`}</div>;
    },
  },
  {
    id: 'sellingPriceAdjustmentYear',
    header: <div>Adjust Period</div>,
    name: 'sellingPriceAdjustmentYear',
    accessor: (row, rowIndex, ctx) => {
      return row['offeringPrice'];
    },
    renderCell: ({ fieldName, row, rows, rowIndex, value, ctx }) => {
      return <div>{`${value}`}</div>;
    },
  },
  {
    id: 'cumulativeAdjustedPeriod',
    header: <div>Cumulative Adjusted Period</div>,
    accessor: (row, rowIndex, ctx) => {
      return row['offeringPrice'];
    },
    renderCell: ({ fieldName, row, rows, rowIndex, value, ctx }) => {
      return <div>{`${value}`}</div>;
    },
  },
];
