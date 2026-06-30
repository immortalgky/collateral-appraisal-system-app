import { FormFields, type FormField } from '@/shared/components/form';
import { machineInfoFields } from '../configs/fields';
import { Icon } from '@/shared/components';
import { useMemo, type ReactNode } from 'react';
import { PropertyNameTriggerIcon } from '../components/PropertyNameTriggerIcon';

interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-full xl:col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-full xl:col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-full xl:col-span-5" />}
  </>
);

const MachineryDetailForm = () => {
  const fillIcon = useMemo(() => <PropertyNameTriggerIcon propertyType="MAC" />, []);

  const machineFields = useMemo<FormField[]>(
    () =>
      machineInfoFields.map(field =>
        field.name === 'propertyName' && fillIcon ? { ...field, rightIcon: fillIcon } : field,
      ),
    [fillIcon],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <SectionRow title="Machinery Information" icon="building">
        <FormFields fields={machineFields} />
      </SectionRow>
    </div>
  );
};

export default MachineryDetailForm;
