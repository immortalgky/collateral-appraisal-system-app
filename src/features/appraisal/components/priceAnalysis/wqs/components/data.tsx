import { NumberInput } from '@/shared/components';
import type { ColumnDef, ColumnGroup, RHFColumn, RHFRow, RowDef } from './types';
import { RHFInputCell } from './RHFInputCell';
import { forecast } from './excelUtils/forecast';

export const SURVEYDATA = [
  {
    id: 'SURVEY_01',
    offeringPrice: 22750,
    offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
    offeringPriceAdjustmentAmt: 0,
    sellingPrice: null,
    sellingPriceMeasurementUnit: null,
    sellingDate: null,
    sellingPriceAdjustmentYear: null,
    numberOfYears: null,
  },
  {
    id: 'SURVEY_02',
    offeringPrice: 22000,
    offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
    offeringPriceAdjustmentAmt: 0,
    sellingPrice: null,
    sellingPriceMeasurementUnit: null,
    sellingDate: null,
    sellingPriceAdjustmentYear: null,
    numberOfYears: null,
  },
];

export const COLLATERAL_TYPE = [
  {
    value: 'L',
    label: 'Land',
  },
  {
    value: 'B',
    label: 'Building',
  },
  {
    value: 'LB',
    label: 'Land and Building',
  },
  {
    value: 'C',
    label: 'Condo',
  },
];

export const TEMPLATE = [
  { value: 'L01', label: 'Land - 01' },
  { value: 'B01', label: 'Building - 01' },
  { value: 'LB01', label: 'Land and Building - 01' },
  { value: 'C01', label: 'Condo - 01' },
];

export const ALL_FACTORS = [
  { value: '01', label: 'Environment' },
  { value: '02', label: 'Plot Location' },
  { value: '03', label: 'Land Condition' },
  { value: '04', label: 'Land Area' },
  { value: '05', label: 'Wide frontage of land adjacent to the road' },
  { value: '06', label: 'Maximum Utilization' },
  { value: '07', label: 'Rule/ Law' },
  { value: '08', label: 'Offering Price' },
  { value: '09', label: 'Selling Price' },
  { value: '10', label: 'Adjustment of Offer Price (Pct)' },
  { value: '11', label: 'Adjustment of Offer Price (Amt)' },
  { value: '12', label: 'Information Date/ Time' },
  { value: '13', label: 'Adjustment of Period (Pct)' },
];

export const TEMP = [
  {
    id: 'L01',
    collateralId: 'L',
    factors: [
      { id: '01', weight: 1, intensity: 10 },
      { id: '02', weight: 2, intensity: 10 },
      { id: '03', weight: 1, intensity: 10 },
      { id: '04', weight: 1, intensity: 10 },
      { id: '05', weight: 1, intensity: 10 },
    ],
  },
  {
    id: 'L02',
    collateralId: 'L',
    factors: [
      { id: '01', weight: 1, intensity: 10 },
      { id: '04', weight: 2, intensity: 10 },
      { id: '05', weight: 2, intensity: 10 },
      { id: '06', weight: 1, intensity: 10 },
      { id: '07', weight: 1, intensity: 10 },
    ],
  },
];

// from template
export const FACTORS = [
  { value: 'L01_TEMP01', label: 'Environment', weight: 1, intensity: 10 },
  { value: 'L01_TEMP02', label: 'Plot Location', weight: 2, intensity: 10 },
  { value: 'L01_TEMP03', label: 'Land Shape', weight: 1, intensity: 10 },
  { value: 'L01_TEMP04', label: 'Land Condition', weight: 1, intensity: 10 },
];

export const columns: RHFColumn[] = [
  {
    id: 'factor',
    header: <div>Factor</div>,
    name: 'factor',
    rhfRenderCell: {
      inputType: 'select',
      options: FACTORS,
    },
  },
  {
    id: 'weight',
    header: <div>Weight</div>,
    name: 'weight',
    className: 'w-30',
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
    className: 'w-30',
    align: 'right',
    renderCell: ({ fieldName, row, ctx }) => {
      // if (row['factor'] ==)
      return <RHFInputCell fieldName={fieldName} inputType="number" />;
    },
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
    className: 'w-16',
    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => (
      <span>{`${row['weight'] * row['intensity']}`}</span>
    ),
    renderOnEditingCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return <span>{`${row['weight'] * row['intensity']}`}</span>;
    },
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

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            {/* <span>{`${row['weight'] * row.score}`}</span> */}
            <span>{`${row['weight'] * row['survey1']}`}</span>
          </div>
        </div>
      );
    },
    renderOnEditingCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <span>{value ?? ''}</span>
          </div>
          <div>
            {/* <span>{`${row['weight'] * row.score}`}</span> */}
            <span>{`${row['weight'] * row['survey1']}`}</span>
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

    // accessor: (row, rowIndex, ctx) => ({
    //   score: row['survey2'],
    // }),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            {/* <span>{`${row['weight'] * value.score}`}</span> */}
            <span>{`${row['weight'] * row['survey2']}`}</span>
          </div>
        </div>
      );
    },

    renderOnEditingCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <span>{value ?? ''}</span>
          </div>
          <div>
            {/* <span>{`${row['weight'] * row.score}`}</span> */}
            <span>{`${row['weight'] * row['survey1']}`}</span>
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

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            {/* <span>{`${row['weight'] * value.score}`}</span> */}
            <span>{`${row['weight'] * row['survey3']}`}</span>
          </div>
        </div>
      );
    },

    renderOnEditingCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <span>{value ?? ''}</span>
          </div>
          <div>
            {/* <span>{`${row['weight'] * row.score}`}</span> */}
            <span>{`${row['weight'] * row['survey1']}`}</span>
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
    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            {/* <span>{`${row['weight'] * value.score}`}</span> */}
            <span>{`${row['weight'] * row['collateral']}`}</span>
          </div>
        </div>
      );
    },
    renderOnEditingCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div className="flex flex-row justify-between items-center">
          <div className="w-18">
            <span>{value ?? ''}</span>
          </div>
          <div>
            {/* <span>{`${row['weight'] * row.score}`}</span> */}
            <span>{`${row['weight'] * row['survey1']}`}</span>
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
export const DEFAULT_WQSSCORE_ROW = [
  {
    factor: '',
    weight: 0,
    intensity: 0,
    survey1: 0,
    survey2: 0,
    survey3: 0,
    collateral: 0,
  },
];

export const defaultComparativeData: Record<string, any>[] = [
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

export const calculationRows: RHFRow[] = [
  {
    id: 'offeringPrice',
    header: <div className="flex justify-start items-center">Offering Price</div>,
    name: 'offeringPrice',
    accessor: (column, columnIndex, ctx) => {
      return column['offeringPrice'];
    },
    renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
      return <div>{`${value ?? ''}`}</div>;
    },
  },
  {
    id: 'offeringPriceAdjustmentPct',
    header: (
      <div className="flex flex-row justify-between items-center">
        <div>Adjustment of Offer Price</div>
        <div>(%)</div>
      </div>
    ),
    name: 'offeringPriceAdjustmentPct',
    accessor: (column, columnIndex, ctx) => {
      return column['offeringPriceAdjustmentPct'] ?? null;
    },
    renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
      return column['offeringPrice'] ? (
        <div>
          <RHFInputCell fieldName={fieldName} inputType="number" />
        </div>
      ) : null;
    },
  },
  {
    id: 'offeringPriceAdjustmentAmt',
    header: (
      <div className="flex flex-row justify-between items-center">
        <div>Adjustment of Offer Price</div>
        <div>(Amt)</div>
      </div>
    ),
    name: 'offeringPriceAdjustmentAmt',
    accessor: (column, columnIndex, ctx) => {
      return column['offeringPriceAdjustmentAmt'] ?? null;
    },
    renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
      return column['offeringPrice'] ? (
        <div>
          <RHFInputCell fieldName={fieldName} inputType="number" />
        </div>
      ) : null;
    },
  },
  {
    id: 'sellingPrice',
    header: <div className="">Selling Price</div>,
    name: 'sellingPrice',
    accessor: (column, columnIndex, ctx) => {
      return column['sellingPrice'] ?? null;
    },
    renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
      return <div>{`${value ?? ''}`}</div>;
    },
  },
  {
    id: 'numberOfYears',
    header: <div>Number of Years</div>,
    name: 'numberOfYears',
    accessor: (column, columnIndex, ctx) => {
      return column['numberOfYears'] ?? '';
    },
    renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
      return <div>{`${value ?? ''}`}</div>;
    },
  },
  {
    id: 'sellingPriceAdjustmentYear',
    header: <div>Adjust Period</div>,
    name: 'sellingPriceAdjustmentYear',
    accessor: (column, columnIndex, ctx) => {
      return column['sellingPriceAdjustmentYear'] ?? '';
    },
    renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
      return column['sellingPrice'] ? (
        <div>
          <RHFInputCell fieldName={fieldName} inputType="number" />
        </div>
      ) : null;
    },
  },
  {
    id: 'cumulativeAdjustedPeriod',
    header: <div>Cumulative Adjusted Period</div>,
    accessor: (column, columnIndex, ctx) => {
      if (!column['numberOfYears'] && !column['sellingPriceAdjustmentYear']) return null;
      return column['numberOfYears'] * column['sellingPriceAdjustmentYear'];
    },
    renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
      return <div>{`${value ?? ''}`}</div>;
    },
  },
  {
    id: 'adjustedValue',
    header: <div>Adjusted Value</div>,
    name: 'adjustedValue',
    rhfRenderCell: { inputType: 'display' },
    derived: {
      compute: ({ column, columns, columnIndex, ctx }) => {
        if (column['offeringPrice'])
          return column['offeringPriceAdjustmentPct'] > 0
            ? column['offeringPrice'] -
                (column['offeringPrice'] * column['offeringPriceAdjustmentPct']) / 100
            : column['offeringPriceAdjustmentAmt'] > 0
              ? column['offeringPriceAdjustmentAmt']
              : column['offeringPrice'];
        return (
          column['sellingPrice'] +
          (column['sellingPrice'] *
            column['numberOfYears'] *
            column['sellingPriceAdjustmentYear']) /
            100
        );
      },
    },
  },
  {
    id: 'finalValue',
    header: <div>Final Value</div>,
    name: 'finalValue',
    renderCell: ({ columns, columnIndex, ctx }) => {
      if (columnIndex !== columns.length - 1) return '';
      const x = (ctx.WQSScores ?? []).reduce((acc, curr) => acc + curr.collateral * curr.weight, 0);
      // known_y = adjusted values of each comparable
      const known_y = (columns ?? [])
        .map((c: any) => Number(c?.adjustedValue))
        .filter(Number.isFinite);

      const known_x = (ctx.WQSScores ?? []).reduce(
        (acc, curr) => {
          return [
            acc[0] + curr.survey1 * curr.weight,
            acc[1] + curr.survey2 * curr.weight,
            acc[2] + curr.survey3 * curr.weight,
          ];
        },
        [0, 0, 0],
      );

      // must have >= 2 points
      if (known_x.length < 2 || known_y.length < 2 || known_x.length !== known_y.length) {
        return <div>0</div>;
      }
      const finalValue = forecast({ x, known_y, known_x });
      return <div>{Number.isFinite(finalValue) ? finalValue.toFixed(2) : 0}</div>;
    },
  },
  {
    id: 'roundedFinalValue',
    header: <div>Final Value</div>,
    renderCell: ({ fieldName, columns, columnIndex }) => {
      if (columnIndex !== columns.length - 1) return '';
      return <RHFInputCell fieldName={'roundedFinalValue'} inputType="number" />;
    },
  },
];
