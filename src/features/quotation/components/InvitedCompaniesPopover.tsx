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

interface InvitedCompany {
  companyId: string;
  companyName: string;
}

interface InvitedCompaniesPopoverProps {
  companies: InvitedCompany[];
  totalInvited: number;
}

const InvitedCompaniesPopover = ({ companies, totalInvited }: InvitedCompaniesPopoverProps) => {
  const { t } = useTranslation('quotation');
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
        className="inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors"
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
              className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[220px] max-w-xs"
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">{t('invitedCompanies.title')}</p>
                <p className="text-[10px] text-gray-400">
                  {t('invitedCompanies.totalLabel', { count: totalInvited })}
                </p>
              </div>
              {companies.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400 italic">
                  {t('empty.namesUnavailable')}
                </p>
              ) : (
                <ul className="max-h-64 overflow-auto py-1">
                  {companies.map(c => (
                    <li
                      key={c.companyId}
                      className="px-3 py-1.5 text-xs text-gray-800 flex items-start gap-1.5"
                    >
                      <span className="text-gray-300 select-none">•</span>
                      <span className="truncate" title={c.companyName}>
                        {c.companyName}
                      </span>
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
