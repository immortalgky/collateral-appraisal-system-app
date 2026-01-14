import { useContext, useEffect, useMemo, useState } from 'react';
import { columnGroups, columns, rows } from './data';
import { DataTable } from './DataTable';
import type { ColumnDef, ColumnGroup } from './types';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

interface RHFArrayTableProps {
  name: string;
  columns: ColumnDef[];
  groups: ColumnGroup[];
  defaultRow: any;
  ctx?: any;
  watch?: Record<string, string>;
}
export const RHFArrayTable = ({
  name,
  columns,
  groups = [],
  defaultRow,
  ctx,
  watch,
}: RHFArrayTableProps) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const handleOnAdd = () => {
    append({ id: '0', factorCode: '01', surveyScore: 0, surveyWeightedScore: 0 });
  };

  const handleOnDelete = (rowIndex: number) => {
    remove(rowIndex);
  };

  const rows = useWatch({ control, name, defaultValue: [...defaultRow] }) ?? [...defaultRow];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      groups={groups}
      ctx={ctx}
      hasHeader={true}
      hasBody={true}
      hasFooter={true}
      onAdd={() => handleOnAdd()}
      onDelete={handleOnDelete}
      hasAddButton={true}
    />
  );
};
