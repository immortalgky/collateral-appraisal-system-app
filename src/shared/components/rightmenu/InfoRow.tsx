import clsx from 'clsx';
import Icon from '../Icon';

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  muted?: boolean;
}

const InfoRow = ({ icon, label, value, muted }: InfoRowProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Icon style="regular" name={icon} className="size-3.5 text-gray-400" />
      {label}
    </div>
    <span className={clsx('text-xs font-medium', muted ? 'text-gray-400' : 'text-gray-700')}>
      {value}
    </span>
  </div>
);

export default InfoRow;
