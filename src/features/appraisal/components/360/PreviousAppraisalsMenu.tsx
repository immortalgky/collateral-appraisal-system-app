import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { PreviousAppraisalChainItem } from '../../api/appraisal';

interface PreviousAppraisalsMenuProps {
  items: PreviousAppraisalChainItem[];
}

/**
 * Header control listing the appraisal's reappraisal / construction-inspection lineage
 * (nearest-ancestor-first). Selecting an entry always navigates to its own 360 page —
 * even from a /tasks/:taskId/360 route, since the previous appraisal has no task here.
 *
 * Renders nothing until the chain is known to be non-empty. Showing the trigger while the
 * query is in flight would flash a button that then vanishes on first-round appraisals,
 * which is the common case.
 */
function PreviousAppraisalsMenu({ items }: PreviousAppraisalsMenuProps) {
  const { t } = useTranslation('appraisal');
  const navigate = useNavigate();

  if (items.length === 0) {
    return null;
  }

  // Menu closes itself on activation, so no explicit close here.
  const handleSelect = (appraisalId: string) => {
    navigate(`/appraisals/${appraisalId}/360`);
  };

  return (
    // Headless UI Menu supplies role="menu"/"menuitem", Escape, focus return, outside-click
    // and arrow-key roving focus. `anchor` portals the panel through floating-ui, which also
    // stops the 320px list clipping off the right edge of the right-aligned header row.
    <Menu as="div" className="relative shrink-0">
      <MenuButton className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <Icon name="clock-rotate-left" style="solid" className="w-3.5 h-3.5 text-gray-500" />
        {t('view360.previousAppraisals.trigger')}
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="mt-1 w-80 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 focus:outline-none"
      >
        {items.map(item => (
          <MenuItem key={item.appraisalId}>
            <button
              type="button"
              onClick={() => handleSelect(item.appraisalId)}
              className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors border-b border-gray-100 last:border-b-0 hover:bg-gray-50 data-focus:bg-gray-100"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-800 truncate">
                  {item.appraisalNumber}
                </span>
                {item.status && (
                  <span>
                    <span className="sr-only">
                      {t('view360.previousAppraisals.fields.status')}:{' '}
                    </span>
                    <Badge type="status" value={item.status} size="xs" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>
                  {t('view360.previousAppraisals.fields.date')}: {item.appraisalDate ?? '-'}
                </span>
                <span>
                  {t('view360.previousAppraisals.fields.value')}:{' '}
                  {item.appraisalValue != null ? formatNumber(item.appraisalValue) : '-'}
                </span>
              </div>
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

export default PreviousAppraisalsMenu;
