import Icon from '@/shared/components/Icon';

interface SectionRowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

const SectionRow = ({ title, icon, children }: SectionRowProps) => (
  <div className="grid grid-cols-5 gap-6">
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
    <div className="col-span-4">{children}</div>
    <div className="h-px bg-gray-200 col-span-5" />
  </div>
);

export default SectionRow;
