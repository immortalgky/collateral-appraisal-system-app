import { useController, useFieldArray, useFormContext } from 'react-hook-form';
import { RHFArrayTable } from './components/RHFArrayTable';
import type { ColumnDef } from './components/types';
import {
  MOC_COMPARATIVE_DATA_LAND,
  MOC_SELECTED_COMPARATIVE_DATA_LAND,
} from './data/comparativeData';
import { boolean } from 'zod';
import { useState } from 'react';

type ComparativeDataRowType = {
  factor: string;
  collateral: string;
  surveys: string[];
};

type ComparativeCtxType = {};

interface ComparativeSectionProps {
  comparativeData: Record<string, string>[];
}

export const ComparativeSection = ({ comparativeData }: ComparativeSectionProps) => {
  const { control } = useFormContext();
  const { fields } = useFieldArray({ control, name: 'comparativeData' });

  const [editingIndex, setEditingIndex] = useState<boolean | undefined>(undefined);

  let comparativeTableConfig: ColumnDef[] = [
    {
      id: 'factor',
      header: <div>Factor</div>,
      name: 'factor',
      rhfRenderCell: {
        inputType: 'select',
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
  ];

  if (comparativeData) {
    comparativeTableConfig = [
      ...comparativeTableConfig,
      ...MOC_SELECTED_COMPARATIVE_DATA_LAND.map((data, index) => ({
        id: `surveys${index}`,
        name: `surveys.${index}.data`,
        header: <div>Survey {index + 1}</div>,
        accessor: ({ row, rowIndex, columnIndex }) => {
          if (!row.surveys[index]) return '';
          return row.surveys[index].data;
        },
        rhfRenderCell: {
          inputType: 'display',
        },
      })),
    ];
  }

  // comparativeTableConfigurations = [
  //   ...comparativeTableConfigurations,
  //   {
  //     id: 'action',
  //     header: <div>Action</div>,
  //     renderCell: ({ row, rows }) => {
  //       return <div>DELETE</div>;
  //     },
  //   },
  // ];

  return (
    <RHFArrayTable
      name="comparativeData"
      columns={comparativeTableConfig}
      defaultRow={{
        factor: '',
        collateral: '',
        surveys: [
          { id: 'survey1', data: '' },
          { id: 'survey2', data: '' },
          { id: 'survey3', data: '' },
        ],
      }}
      hasAddButton={true}
      hasFooter={false}
      canEdit={true}
    />
  );
};
