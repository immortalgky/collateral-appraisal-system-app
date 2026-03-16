import { FormFields } from '@/shared/components/form';
import { machineInfoFields } from '../configs/fields';
import { Icon } from '@/shared/components';
import type { ReactNode } from 'react';

interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-5" />}
  </>
);

const MachineryDetailForm = () => {
  return (
    <div className="grid grid-cols-5 gap-6">
      <SectionRow title="Machinery Information" icon="building">
        <FormFields fields={machineInfoFields} />
      </SectionRow>
    </div>
  );
};

export default MachineryDetailForm;
