import Icon from '../Icon';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
}

const StatCard = ({ label, value, icon }: StatCardProps) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shadow-sm">
      <Icon style="regular" name={icon} className="size-3.5 text-gray-500" />
    </div>
    <div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  </div>
);

export default StatCard;
