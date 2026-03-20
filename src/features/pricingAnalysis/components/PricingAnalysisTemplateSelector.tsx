import { Icon, type ListBoxItem } from '@/shared/components';
import { RHFInputCell } from './table/RHFInputCell';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface PricingAnalysisTemplateSelectorProps {
  icon: string;
  methodName: string;
  onGenerate: () => void;
  collateralType: {
    fieldName?: string;
    onSelectCollateralType: (value: string) => void;
    value: any;
    options: ListBoxItem[];
  };
  template: {
    fieldName?: string;
    onSelectTemplate: (value: string) => void;
    value: any;
    options: ListBoxItem[];
  };
}
export function PricingAnalysisTemplateSelector({
  icon,
  methodName,
  onGenerate,
  collateralType,
  template,
}: PricingAnalysisTemplateSelectorProps) {
  const isReadOnly = usePageReadOnly();

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
          <Icon name={icon} className="size-4" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{methodName}</h2>
      </div>
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex h-full items-center text-sm font-medium text-gray-600 shrink-0">
          Pricing Analysis Template
        </div>
        <div className="flex-1 min-w-0">
          {/* <Dropdown
            label="Collateral Type"
            options={collateralType.options}
            value={collateralType.value}
            onChange={value => {
              collateralType.onSelectCollateralType(value);
            }}
          /> */}
          <div className="flex-1 min-w-0">
            <RHFInputCell
              dropdown={{ label: 'Collateral Type' }}
              fieldName={collateralType.fieldName ?? 'collateralType'}
              inputType="select"
              options={collateralType.options}
              onSelectChange={value => {
                collateralType.onSelectCollateralType(value);
              }}
              disabled={isReadOnly}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <RHFInputCell
            dropdown={{ label: 'Template' }}
            fieldName={template.fieldName ?? 'pricingTemplateCode'}
            inputType="select"
            options={template.options}
            onSelectChange={value => {
              template.onSelectTemplate(value);
            }}
            disabled={isReadOnly}
          />
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => onGenerate()}
            className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-primary/90 transition-colors shrink-0"
          >
            Generate
          </button>
        )}
      </div>
    </div>
  );
}
