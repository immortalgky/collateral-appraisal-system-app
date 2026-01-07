import { Icon } from '@/shared/components';
import { Checkbox } from '@/shared/components/inputs';
import clsx from 'clsx';

interface ApproachCardProps {
  mode: 'editing' | 'summary';
  approach: any;
  method: any;
  onSelectedChange: (approach: any, method: any) => void;
}

export const ApproachCard = ({ mode, approach, method, onSelectedChange }: ApproachCardProps) => {
  if (mode === 'editing') {
    const onCheckboxChange = (isChange: boolean) => {
      onSelectedChange(approach, method);
    };
    return (
      <div
        className={clsx(
          'flex gap-4 items-center h-14 py-2 px-4',
          `${method.isSelected && 'bg-primary-200'}`,
        )}
      >
        <Icon name={method.icon} style="solid" className="size-3" />
        <span className="w-full">{method.label}</span>
        <Checkbox
          checked={method.isSelected}
          defaultChecked={method.isSelected}
          onChange={onCheckboxChange}
        />
      </div>
    );
  }
  return <div>Approach Card</div>;
};
