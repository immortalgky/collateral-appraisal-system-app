import { useState } from 'react';
import { Icon } from '@/shared/components';
import { RHFInputCell } from '../../components/table/RHFInputCell';
import { getDesciptions, getPropertyValueByFactorCode } from './WQSSection';
import { MarketSurveySelectionModal } from '../../components/MarketSurveySelectionModal';
import type { RHFHorizontalColumn } from '../../adapters/rhf-table/spec';
import { RHFHorizontalArrayTable } from '../../adapters/rhf-table/RHFArrayTable';
import { MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND } from '../../data/comparativeData';

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
  property: Record<string, string>;
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
  const [showMarketSurveySelection, setShowMarketSurveySelection] = useState<boolean>(false);

  let comparativeTableConfig: RHFHorizontalColumn<Record<string, any>, any>[] = [
    // config factor column
    {
      id: 'factorCode',
      header: <div className="">Factor</div>,
      style: {
        headerClassName: 'border-r border-neutral-300 w-[200px]',
        bodyClassName: 'border-r border-neutral-300 h-[56px] border-b border-gray-300',
      },
      field: 'factorCode',
      render: ({ row, rowIndex, fieldPath, ctx, value }) => {
        const totalTemplateFactors = ctx.template?.comparativeFactors?.length ?? 0;
        if (rowIndex >= totalTemplateFactors) {
          return (
            <div className="w-[200px]">
              <RHFInputCell
                fieldName={fieldPath}
                inputType="select"
                options={ctx.allFactors.map(factor => ({
                  label: factor.description,
                  value: factor.value,
                }))}
              />
            </div>
          );
        }
        return (
          <div className="w-[200px] p-2 truncate" title={getDesciptions(value) ?? ''}>
            <span>{getDesciptions(value) ?? ''}</span>
          </div>
        );
      },
    },
    // config collateral column
    {
      id: 'collateral',
      header: <div className="">Collateral</div>,
      style: {
        headerClassName: 'border-r border-neutral-300 min-w-[200px]',
        bodyClassName: 'border-r border-neutral-300 h-[56px]  border-b border-gray-300',
      },
      field: 'collateral',
      render: ({ row }) => {
        const propertyValue = getPropertyValueByFactorCode(row['factorCode'], property) ?? '';
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
        header: <div className="">Survey {index + 1}</div>,
        style: {
          headerClassName: 'border-r border-neutral-300 w-[200px]',
          bodyClassName: 'border-r border-neutral-300 h-[56px] border-b border-gray-300',
        },
        field: `surveys.${index}.value`,
        render: ({ row, ctx }) => {
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
      style: {
        headerClassName: 'w-16',
        bodyClassName: ' border-b border-gray-300',
      },
      render: ({ rowIndex, ctx, actions: { removeColumn } }) => {
        /*
          factor which was set from template not allow to change
         */
        if (rowIndex >= ctx.template.comparativeFactors.length)
          return (
            <div className="flex justify-center items-center">
              <button
                type="button"
                // onClick={() => onRemove?.(rowIndex)}
                onClick={() => removeColumn(rowIndex)}
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
        <RHFHorizontalArrayTable
          name="comparativeFactors"
          columns={comparativeTableConfig}
          defaultRow={{
            factorCode: '',
          }}
          hasHeader={true}
          hasBody={true}
          hasFooter={false}
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
