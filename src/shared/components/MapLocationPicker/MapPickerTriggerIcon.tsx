import { useTranslation } from 'react-i18next';

interface MapPickerTriggerIconProps {
  onClick: () => void;
}

// Used as `rightIcon` on lat/lon inputs. Three things matter here:
// - `pointer-events-auto` opts back in past the input wrapper's
//   `pointer-events-none` (which exists so decorative icons don't steal clicks)
// - `onMouseDown preventDefault` stops focus from shifting to the input
// - `p-1 -m-1` expands the hit area to 24x24 (WCAG 2.5.8 minimum) without
//   enlarging the visible icon
export function MapPickerTriggerIcon({ onClick }: MapPickerTriggerIconProps) {
  const { t } = useTranslation('historySearch');
  const label = t('locationPicker.buttonLabel');
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
      title={label}
      aria-label={label}
      className="pointer-events-auto p-1 -m-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    </button>
  );
}
