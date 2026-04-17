import Icon from '@/shared/components/Icon';
import type { SmartViewDto } from '../../api/appraisalSearch';

interface SmartViewBarProps {
  views: SmartViewDto[];
  activeViewKey: string | null;
  onSelect: (view: SmartViewDto) => void;
}

const viewIcons: Record<string, string> = {
  'my-assignments': 'user',
  'sla-at-risk': 'triangle-exclamation',
  'todays-appointments': 'calendar-day',
  unassigned: 'inbox',
  'high-priority-active': 'bolt',
  'nearing-deadline': 'clock',
  'external-assignments': 'building',
  'my-company-queue': 'briefcase',
};

function SmartViewBar({ views, activeViewKey, onSelect }: SmartViewBarProps) {
  if (!views.length) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-xs text-gray-500 shrink-0">Quick views:</span>
      {views.map(view => (
        <button
          key={view.key}
          onClick={() => onSelect(view)}
          title={view.description}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
            activeViewKey === view.key
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
          }`}
        >
          <Icon style="solid" name={viewIcons[view.key] || 'filter'} className="size-3" />
          {view.name}
        </button>
      ))}
    </div>
  );
}

export default SmartViewBar;
