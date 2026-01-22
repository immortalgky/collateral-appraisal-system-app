import { useFieldArray, useFormContext } from 'react-hook-form';
import { RHFArrayTable } from './components/RHFArrayTable';
import type { ColumnDef } from './components/types';
import { useState } from 'react';
import { Icon } from '@/shared/components';
import { RHFInputCell } from './components/RHFInputCell';
import { getDesciptions, getPropertyValueByFactorCode } from './WQSSection';
import { MarketSurveySelectionModal } from './components/MarketSurveySelectionModal';
import { MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND } from './data/comparativeData';
import type { WQSTemplate } from './data/data';

type ComparativeDataRowType = {
  factor: string;
  collateral: string;
  surveys: string[];
};

type ComparativeCtxType = {};

interface ComparativeSectionProps {
  surveys: Record<string, any>[];
  comparativeSurveys: Record<string, any>[];
  template: WQSTemplate;
  property: Record<string, string>[];
  allFactors: { value: string; description: string }[];
  onSelectMarketSurvey: (survey: Record<string, any>) => void;
}

export const ComparativeSection = ({
  surveys,
  comparativeSurveys,
  template,
  property,
  allFactors,
  onSelectMarketSurvey,
}: ComparativeSectionProps) => {
  const { control, getValues } = useFormContext();
  const [showMarketSurveySelection, setShowMarketSurveySelection] = useState<boolean>(false);

  let comparativeTableConfig: ColumnDef[] = [
    // config factor column
    {
      id: 'factorCode',
      name: 'factorCode',
      header: <div className="px-2 py-4">Factor</div>,
      className: 'border-r border-neutral-300 w-60',
      renderCell: ({ row, rowIndex, fieldName, ctx, value }) => {
        const totalTemplateFactors = ctx.template?.comparativeFactors?.length ?? 0;
        if (rowIndex >= totalTemplateFactors) {
          return (
            <RHFInputCell
              fieldName={fieldName}
              inputType="select"
              options={ctx.allFactors.map(factor => ({
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
      header: <div className="px-2 py-4">Collateral</div>,
      className: 'border-r border-neutral-300 min-w-60',
      renderCell: ({ row }) => {
        const propertyValue = getPropertyValueByFactorCode(row['factorCode']) ?? '';
        return (
          <div className="w-full truncate" title={propertyValue ?? ''}>
            {propertyValue ?? ''}
          </div>
        );
      },
    },
  ];

  // config market survey column
  if (comparativeSurveys) {
    comparativeTableConfig = [
      ...comparativeTableConfig,
      ...comparativeSurveys.map((data, index) => ({
        id: `surveys${index}`,
        name: `surveys.${index}.value`,
        header: <div className="px-2 py-4">Survey {index + 1}</div>,
        className: 'border-r border-neutral-300 min-w-20',
        renderCell: ({ row, ctx }) => {
          const surveys =
            ctx.surveys[index].factors.find(factor => factor.id === row['factorCode'])?.value ?? '';
          return (
            <div className="w-full truncate" title={surveys ?? ''}>
              {surveys ?? ''}
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
      header: <div className="px-2 py-4"></div>,
      className: 'w-16',
      renderCell: ({ rowIndex, onRemove, ctx }) => {
        /*
          factor which was set from template not allow to change
         */
        if (rowIndex >= ctx.template.comparativeFactors.length)
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
          onClick={() => setShowMarketSurveySelection(true)}
          className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
        >
          Add Comparative Data
        </button>
        {showMarketSurveySelection && (
          <MarketSurveySelectionModal
            allFactors={allFactors}
            surveys={MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND}
            comparativeSurveys={comparativeSurveys}
            onSelect={onSelectMarketSurvey}
            onCancel={() => setShowMarketSurveySelection(false)}
          />
        )}
      </div>
      <div>
        <RHFArrayTable
          name="comparativeFactors"
          columns={comparativeTableConfig}
          defaultRow={{
            factorCode: '',
          }}
          hasAddButton={true}
          hasFooter={false}
          canEdit={true}
          ctx={{
            allFactors: allFactors,
            template,
            surveys: comparativeSurveys,
            property,
          }}
        />
      </div>
    </div>
  );
};
