import { useTranslation } from 'react-i18next';
import type { PropertiesViewMode } from '@shared/types';
import { PROPERTIES_VIEW_MODES } from '@shared/components/propertiesViewModeConstants';
import { SegmentedControl } from '@shared/components/SegmentedControl';

/**
 * The four ways to lay out the Properties tab.
 *
 * The Markets and Gallery tabs' toggles use the same `SegmentedControl` underneath, each with its
 * own set of modes.
 */
const VIEW_ICONS: Record<PropertiesViewMode, string> = {
  rows: 'list',
  cards: 'grid-2',
  table: 'table-list',
  split: 'table-columns',
};

interface PropertiesViewSwitcherProps {
  value: PropertiesViewMode;
  onChange: (mode: PropertiesViewMode) => void;
}

export const PropertiesViewSwitcher = ({ value, onChange }: PropertiesViewSwitcherProps) => {
  const { t } = useTranslation('appraisal');

  return (
    <SegmentedControl
      options={PROPERTIES_VIEW_MODES.map(mode => ({
        value: mode,
        label: t(`properties.viewModes.${mode}`),
        icon: VIEW_ICONS[mode],
      }))}
      value={value}
      onChange={onChange}
    />
  );
};

export default PropertiesViewSwitcher;
