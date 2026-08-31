import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { SmartViewDto } from '../../api/appraisalSearch';

interface SmartViewBarProps {
  views: SmartViewDto[];
  activeViewKey: string | null;
  onSelect: (view: SmartViewDto) => void;
}

/**
 * Icon and colour per quick view. The colour carries the same meaning it does elsewhere in the
 * product — red for breached, amber for at-risk, gray for "nobody has it yet" — so the row can be
 * scanned without reading eight Thai labels.
 *
 * Only applied when the chip is inactive: an active chip is solid primary and its icon inherits
 * white, which has to stay legible.
 */
interface ViewStyle {
  icon: string;
  /** Icon colour on an unselected chip. */
  color: string;
  /** Whole chip when selected. A darker step than `color` where the lighter one cannot carry
   *  white text — amber in particular. */
  active: string;
  /** Border on hover while unselected. */
  hover: string;
}

// Whole class strings, not assembled at runtime: Tailwind scans source text, so `text-${hue}-500`
// never makes it into the stylesheet.
const viewStyles: Record<string, ViewStyle> = {
  'my-assignments': {
    icon: 'user',
    color: 'text-primary',
    active: 'bg-primary border-primary text-white',
    hover: 'hover:border-primary',
  },
  'sla-at-risk': {
    icon: 'triangle-exclamation',
    color: 'text-rose-500',
    active: 'bg-rose-500 border-rose-500 text-white',
    hover: 'hover:border-rose-400',
  },
  'todays-appointments': {
    icon: 'calendar-day',
    color: 'text-blue-500',
    active: 'bg-blue-500 border-blue-500 text-white',
    hover: 'hover:border-blue-400',
  },
  unassigned: {
    icon: 'inbox',
    color: 'text-gray-400',
    active: 'bg-gray-500 border-gray-500 text-white',
    hover: 'hover:border-gray-400',
  },
  'high-priority-active': {
    icon: 'bolt',
    color: 'text-orange-500',
    active: 'bg-orange-500 border-orange-500 text-white',
    hover: 'hover:border-orange-400',
  },
  'nearing-deadline': {
    icon: 'clock',
    color: 'text-amber-500',
    active: 'bg-amber-600 border-amber-600 text-white',
    hover: 'hover:border-amber-400',
  },
  'external-assignments': {
    icon: 'building',
    color: 'text-indigo-500',
    active: 'bg-indigo-500 border-indigo-500 text-white',
    hover: 'hover:border-indigo-400',
  },
  'my-company-queue': {
    icon: 'briefcase',
    color: 'text-teal-600',
    active: 'bg-teal-600 border-teal-600 text-white',
    hover: 'hover:border-teal-500',
  },
};

const DEFAULT_VIEW_STYLE: ViewStyle = {
  icon: 'filter',
  color: 'text-gray-400',
  active: 'bg-primary border-primary text-white',
  hover: 'hover:border-primary',
};

function SmartViewBar({ views, activeViewKey, onSelect }: SmartViewBarProps) {
  const { t } = useTranslation('appraisal');
  if (!views.length) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-xs text-gray-500 shrink-0">{t('list.quickViews')}</span>
      {views.map(view => {
        const style = viewStyles[view.key] ?? DEFAULT_VIEW_STYLE;
        const isActive = activeViewKey === view.key;
        return (
          <button
            key={view.key}
            onClick={() => onSelect(view)}
            title={view.description}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
              isActive ? style.active : `bg-white text-gray-600 border-gray-200 ${style.hover}`
            }`}
          >
            {/* Inherit white when active; carry the view's own colour otherwise. */}
            <Icon
              style="solid"
              name={style.icon}
              className={`size-3 ${isActive ? '' : style.color}`}
            />
            {/* The server sends English names. Translate off the stable `key` instead, so the
              contract with the backend is untouched and an unknown key still shows its name. */}
            {t(`list.smartViews.${view.key}`, { defaultValue: view.name })}
          </button>
        );
      })}
    </div>
  );
}

export default SmartViewBar;
