import { useState } from 'react';
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
} from '@floating-ui/react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { InvitedCompanyDto } from '../schemas/quotation';
import { MissingSegmentsBadge } from './SegmentBadges';

type InvitedCompany = Pick<
  InvitedCompanyDto,
  'companyId' | 'companyName' | 'companyNameLocal' | 'missingSegments'
>;

interface InvitedCompaniesPopoverProps {
  companies: InvitedCompany[];
  totalInvited: number;
  /** Draft only: coverage gaps block Send, so they are meaningless once the quotation is sent. */
  showSegmentGaps?: boolean;
}

const InvitedCompaniesPopover = ({
  companies,
  totalInvited,
  showSegmentGaps = false,
}: InvitedCompaniesPopoverProps) => {
  const { t } = useTranslation('quotation');
  const localizeCompanyName = useLocalizedCompanyName();
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  if (totalInvited === 0) return null;

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        aria-label={t('aria.viewInvitedCompanies')}
        className="inline-flex items-center text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Icon name="circle-info" style="solid" className="size-3.5" />
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-(--palette-surface) rounded-lg border border-(--palette-line) shadow-lg min-w-[220px] max-w-xs"
            >
              <div className="px-3 py-2 border-b border-(--palette-line-soft)">
                <p className="text-xs font-semibold text-(--palette-ink)">
                  {t('invitedCompanies.title')}
                </p>
                <p className="text-[10px] text-(--palette-gray-400)">
                  {t('invitedCompanies.totalLabel', { count: totalInvited })}
                </p>
              </div>
              {companies.length === 0 ? (
                <p className="px-3 py-3 text-xs text-(--palette-gray-400) italic">
                  {t('empty.namesUnavailable')}
                </p>
              ) : (
                <ul className="max-h-64 overflow-auto py-1">
                  {companies.map(c => (
                    <li
                      key={c.companyId}
                      className="px-3 py-1.5 text-xs text-(--palette-ink) flex items-start gap-1.5"
                    >
                      <span className="text-(--palette-gray-300) select-none">•</span>
                      <span
                        className="truncate"
                        title={localizeCompanyName(c.companyName, c.companyNameLocal)}
                      >
                        {localizeCompanyName(c.companyName, c.companyNameLocal)}
                      </span>
                      {showSegmentGaps && (
                        <MissingSegmentsBadge missing={c.missingSegments ?? []} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

export default InvitedCompaniesPopover;
