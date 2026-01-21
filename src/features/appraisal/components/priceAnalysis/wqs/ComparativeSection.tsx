import { useFieldArray, useFormContext } from 'react-hook-form';
import { RHFArrayTable } from './components/RHFArrayTable';
import type { ColumnDef } from './components/types';
import { MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND } from './data/comparativeData';
import { useState } from 'react';
import { Icon } from '@/shared/components';
import { RHFInputCell } from './components/RHFInputCell';
import { ALL_FACTORS, PROPERTIES, TEMPLATE } from './data/data';
import { getDesciptions, getPropertyValueByFactorCode } from './WQSSection';

type ComparativeDataRowType = {
  factor: string;
  collateral: string;
  surveys: string[];
};

type ComparativeCtxType = {};

interface ComparativeSectionProps {
  comparativeData: Record<string, string>[];
  surveyData: Record<string, any>[];
}

export const ComparativeSection = ({ comparativeData, surveyData }: ComparativeSectionProps) => {
  const { control, getValues } = useFormContext();
  const { fields } = useFieldArray({ control, name: 'comparativeData' });

  const [editingIndex, setEditingIndex] = useState<boolean | undefined>(undefined);

  let comparativeTableConfig: ColumnDef[] = [
    // config factor column
    {
      id: 'factorId',
      name: 'factorId',
      header: <div>Factor</div>,
      className: 'border-r border-neutral-300 w-60',
      renderCell: ({ row, rowIndex, fieldName, ctx, value }) => {
        if (rowIndex >= ctx.template[0].comparativeFactors.length) {
          return (
            <RHFInputCell
              fieldName={fieldName}
              inputType="select"
              options={ctx.factors.map(factor => ({
                label: factor.description,
                value: factor.value,
              }))}
            />
          );
        }
        return (
          <div className="w-full truncate" title={getDesciptions(value) ?? ''}>
            <span>{getDesciptions(value) ?? ''}</span>
          </div>
        );
      },
    },
    // config collateral column
    {
      id: 'collateral',
      name: 'collateral',
      header: <div>Collateral</div>,
      className: 'border-r border-neutral-300 min-w-60',
      accessor: ({ row, rowIndex, columnIndex, ctx }) => {
        return getPropertyValueByFactorCode(row['factorId']) ?? '';
      },
      renderCell: ({ value }) => {
        return (
          <div className="w-full truncate" title={value ?? ''}>
            {value ?? ''}
          </div>
        );
      },
    },
  ];

  // config market survey column
  if (comparativeData) {
    comparativeTableConfig = [
      ...comparativeTableConfig,
      ...comparativeData.map((data, index) => ({
        id: `surveys${index}`,
        name: `surveys.${index}.value`,
        header: <div>Survey {index + 1}</div>,
        className: 'border-r border-neutral-300 min-w-20',
        accessor: ({ row, rowIndex, columnIndex, ctx }) => {
          return (
            ctx.surveyData[index].factors.find(factor => factor.id === row['factorId'])?.value ?? ''
          );
        },
        renderCell: ({ value }) => {
          return (
            <div className="w-full truncate" title={value ?? ''}>
              {value ?? ''}
            </div>
          );
        },
      })),
    ];
  }

  // config delete column
  comparativeTableConfig = [
    ...comparativeTableConfig,
    {
      id: 'action',
      header: <div></div>,
      className: 'w-16',
      renderCell: ({ rowIndex, onRemove, ctx }) => {
        /*
          factor which was set from template not allow to change
         */
        if (rowIndex >= ctx.template[0].comparativeFactors.length)
          return (
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => onRemove?.(rowIndex)}
                className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                title="Delete"
              >
                <Icon style="solid" name="trash" className="size-3.5" />
              </button>
            </div>
          );
        return <div></div>;
      },
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-300 overflow-clip">
      <div className="p-2">
        <button
          type="button"
          onClick={() => console.log('Add comparative data!')}
          className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
        >
          Add Comparative Data
        </button>
      </div>
      <div>
        <RHFArrayTable
          name="comparativeData"
          columns={comparativeTableConfig}
          defaultRow={{
            factorId: '',
          }}
          hasAddButton={true}
          hasFooter={false}
          canEdit={true}
          ctx={{
            factors: ALL_FACTORS,
            template: TEMPLATE,
            surveyData: surveyData,
            property: PROPERTIES[0],
          }}
        />
      </div>
    </div>
  );
};
