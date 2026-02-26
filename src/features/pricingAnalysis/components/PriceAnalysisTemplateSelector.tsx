import { Dropdown, Icon, type ListBoxItem } from '@/shared/components';

interface PriceAnalysisTemplateSelectorProps {
  icon: string;
  methodName: string;
  onGenerate: () => void;
  collateralType: {
    onSelectCollateralType: (value: string) => void;
    value: any;
    options: ListBoxItem[];
  };
  template: {
    onSelectTemplate: (value: string) => void;
    value: any;
    options: ListBoxItem[];
  };
}
export function PriceAnalysisTemplateSelector({
  icon,
  methodName,
  onGenerate,
  collateralType,
  template,
}: PriceAnalysisTemplateSelectorProps) {
  return (
    <div>
      <div className="flex flex-row gap-2">
        <div className="text-2xl">
          <Icon name={icon} />
        </div>
        <span className="text-2xl">{methodName}</span>
      </div>
      <div className="grid grid-cols-12 items-end gap-4">
        <div className="col-span-2 flex h-full items-center">
          <span>Pricing Analysis Template</span>
        </div>
        <div className="col-span-3">
          <Dropdown
            label="Collateral Type"
            options={collateralType.options}
            value={collateralType.value}
            onChange={value => {
              collateralType.onSelectCollateralType(value);
            }}
          />
        </div>
        <div className="col-span-3">
          <Dropdown
            label="Template"
            options={template.options}
            value={template.value}
            onChange={value => {
              template.onSelectTemplate(value);
            }}
          />
        </div>
        <div className="col-span-2">
          <button
            type="button"
            onClick={() => onGenerate()}
            className="px-4 py-2 border border-primary text-primary rounded-lg cursor-pointer hover:bg-primary/10"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
