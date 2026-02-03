// import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
// import { builder } from './builder';
// import { useMemo } from 'react';
// import { DataGrid } from '../../components/table/DataGrid';
// import type { GridColumn, GridGroup, GridRow } from '../../components/table/types';

// export const RHFTable = <Row extends Record<string, any>, Ctx>({
//   name,
//   rowDefs,
//   columnDefs,
//   columnGroups,
//   ctx,
//   defaultColumn,
// }: {
//   name: string;
//   rowDefs: RHFRowDef<ColumnItem, Ctx>[];
//   columnDefs: RHFColumnDef<Row, Ctx>[];
//   columnGroups?: GridGroup[];
//   ctx: Ctx;
//   defaultColumn: ColumnItem;
// }) => {
//   const { control, getValues } = useFormContext();
//   const { fields, append, remove } = useFieldArray({ control, name });
//   const watched = useWatch({ control, name, defaultValue: [] }) as ColumnItem[];
//   // const watched = getValues(name) as ColumnItem[];

//   const {
//     gridRows,
//     gridCols,
//   }: {
//     gridRows: GridRow<ColumnItem>;
//     gridCols: GridColumn<ColumnItem, Ctx>;
//   } = useMemo(() => {
//     return builder<ColumnItem, Ctx>({
//       arrayName: name,
//       items: fields.map((f, i) => ({ value: watched?.[i] ?? {}, id: f.id })),
//       rowDefs: rowDefs,
//       columnDefs: columnDefs,
//       onAppend: append,
//       onRemove: remove,
//     });
//   }, [name, fields, rowDefs, columnDefs, append, remove, watched]);

//   return (
//     <div className="border border-gray-300 overflow-clip">
//       <DataGrid<ColumnItem, Ctx>
//         rows={gridRows}
//         columns={gridCols}
//         groups={columnGroups}
//         ctx={ctx}
//         hasHeader={true}
//         hasBody={true}
//         hasFooter={false}
//       />
//     </div>
//   );
// };
