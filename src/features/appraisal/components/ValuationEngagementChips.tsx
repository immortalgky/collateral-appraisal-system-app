import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Modal from '@/shared/components/Modal';
import DatePickerInput from '@/shared/components/inputs/DatePickerInput';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

import {
  useGetCompanyById,
  useGetEligibleCompanies,
  useSetOfflineExternalEngagement,
} from '../api/administration';
import type { CurrentAssignment, ExternalCompany } from '../types/administration';
import CompanyDisplay from './CompanyDisplay';
import SearchCompanyModal from './SearchCompanyModal';

interface ValuationEngagementChipsProps {
  appraisalId: string;
  /** The active assignment. Null or internal-only ⇒ nothing is rendered. */
  assignment: CurrentAssignment | null;
  /**
   * Whether this user may CHANGE the engagement. True only on the off-system key-in task, for its
   * owner, before the book is handed on. Every other case — including a normal external assignment,
   * where the company was chosen by company-selection — is display-only.
   */
  canEdit?: boolean;
  currentUsername?: string | null;
  /** Reports pending edits so the page can enable Save and guard navigation away. */
  onDirtyChange?: (isDirty: boolean) => void;
  /**
   * Reports whether BOTH the company and the book date are present right now — staged or saved.
   * The page blocks submit on this rather than on the fetched assignment, which goes stale for a
   * tick after a save and would produce a false "not recorded".
   */
  onCompletenessChange?: (isComplete: boolean) => void;
  /** Lets the page's action-bar Save persist the engagement; resolves false on validation failure. */
  saveHandleRef?: MutableRefObject<(() => Promise<boolean>) | null>;
}

/**
 * Shows WHO appraised this collateral, in the Valuation group header next to the appraisal date.
 *
 * Displayed for any appraisal that has an external company, so a normal external case is as
 * legible as an off-system one — previously neither surfaced the company on this page at all.
 *
 * For an off-system engagement (the bank engaged the company outside the system, an internal
 * appraiser keys its book in) the same chips gain an edit affordance that opens a dialog for the
 * company and the book's appraisal date. Editing is deliberately behind a dialog rather than inline:
 * the company needs a search-backed picker and both fields are required, which does not fit a
 * one-line header without wrapping badly.
 *
 * Saving is owned by the page's action bar via `saveHandleRef` — the dialog only stages values, so
 * there is one Save button for the user.
 */
const ValuationEngagementChips = ({
  appraisalId,
  assignment,
  canEdit = false,
  currentUsername,
  onDirtyChange,
  onCompletenessChange,
  saveHandleRef,
}: ValuationEngagementChipsProps) => {
  const { t } = useTranslation('appraisal');
  const editDialog = useDisclosure();
  const companyModal = useDisclosure();

  const [selectedCompany, setSelectedCompany] = useState<ExternalCompany | null>(null);
  const [bookDate, setBookDate] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Seed each field from the server exactly once, and PER FIELD. The company and the date arrive
  // from two different queries (the date rides the assignments query, the company needs a second
  // lookup), so one shared latch closed as soon as the faster one landed and the company never
  // seeded on a hard refresh. A latch is still needed so clearing a field does not re-restore it.
  const hasSeededCompany = useRef(false);
  const hasSeededBookDate = useRef(false);

  const { data: savedCompany } = useGetCompanyById(assignment?.assigneeCompanyId ?? null);
  const { mutate: saveEngagement } = useSetOfflineExternalEngagement();

  // Deliberately unfiltered by banking segment: that scoping exists for the round-robin pool, where
  // the SYSTEM picks. Here the bank already engaged a company outside the system and the keyer must
  // record whichever one it actually was. The backend still rejects a company outside its MOU
  // window. requireSegment:false is load-bearing — the hook is otherwise disabled without a segment
  // and the picker would spin forever. Fetched only once the picker opens.
  const { data: eligibleCompanies } = useGetEligibleCompanies(
    undefined,
    companyModal.isOpen,
    false,
  );

  const savedBookDate = assignment?.offlineBookDate ?? null;

  useEffect(() => {
    if (hasSeededCompany.current || !savedCompany) return;
    setSelectedCompany(savedCompany);
    hasSeededCompany.current = true;
  }, [savedCompany]);

  useEffect(() => {
    if (hasSeededBookDate.current || !savedBookDate) return;
    setBookDate(format(new Date(savedBookDate), 'yyyy-MM-dd'));
    hasSeededBookDate.current = true;
  }, [savedBookDate]);

  useEffect(() => {
    onCompletenessChange?.(!!selectedCompany?.id && !!bookDate);
  }, [selectedCompany, bookDate, onCompletenessChange]);

  const markDirty = () => {
    if (isDirty) return;
    setIsDirty(true);
    onDirtyChange?.(true);
  };

  // Persist on demand. A no-op returning true when untouched, so the decision can still be saved
  // before the keyer has the company or date to hand; false when pending edits fail validation, so
  // the page aborts rather than saving the decision and silently dropping the engagement.
  const persistEngagement = (): Promise<boolean> => {
    if (!canEdit || !isDirty) return Promise.resolve(true);

    if (!selectedCompany?.id) {
      toast.error(t('offlineEngagement.validation.companyRequired'));
      return Promise.resolve(false);
    }
    if (!bookDate) {
      toast.error(t('offlineEngagement.validation.bookDateRequired'));
      return Promise.resolve(false);
    }

    return new Promise<boolean>(resolve =>
      saveEngagement(
        {
          appraisalId,
          companyId: selectedCompany.id,
          // Date-only string. DatePickerInput emits an offset-bearing ISO timestamp, which the
          // backend binds to DateTime and converts to server local time — on a node outside UTC+07
          // that lands on the previous calendar day, printing a book date a day early.
          bookDate: format(new Date(bookDate), 'yyyy-MM-dd'),
          assignedBy: currentUsername ?? null,
        },
        {
          onSuccess: () => {
            setIsDirty(false);
            onDirtyChange?.(false);
            toast.success(t('offlineEngagement.toasts.saved'));
            resolve(true);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('offlineEngagement.toasts.saveFailed'));
            resolve(false);
          },
        },
      ),
    );
  };

  // Re-registered every render so the handle closes over the latest staged values.
  useEffect(() => {
    if (!saveHandleRef) return;
    saveHandleRef.current = persistEngagement;
    return () => {
      saveHandleRef.current = null;
    };
  });

  // selectedCompany is the single source of truth — deliberately WITHOUT falling back to
  // savedCompany. The seeding effect above copies the server value into it, so the fallback only
  // ever covered the brief pre-seed render; what it actually did was make a CLEARED company
  // indistinguishable from an unloaded one, so clearing in the dialog left the old name on the chip.
  //
  // Nothing to show for an internal appraisal, or before a company has ever been recorded on a
  // case the current user cannot edit.
  const companyName = selectedCompany?.companyName ?? null;
  if (!companyName && !canEdit) return null;

  // Outstanding = the keyer can still record it and has not. Completing the task is blocked on it
  // server-side (RequireOfflineEngagementRecorded), so the chip is styled as a call to action
  // rather than a quiet grey label — it is the one thing on this page nobody else can supply.
  // Both are required. On this path the save endpoint writes them together, so in practice they
  // go missing together — but the pill names whichever is actually absent rather than assuming.
  const isOutstanding = canEdit && (!companyName || !bookDate);

  return (
    <>
      {isOutstanding ? (
        <button
          type="button"
          onClick={editDialog.onOpen}
          className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors cursor-pointer"
          title={t('offlineEngagement.title')}
        >
          <Icon name="triangle-exclamation" style="solid" className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {!companyName && !bookDate
              ? t('offlineEngagement.outstandingBoth')
              : !companyName
                ? t('offlineEngagement.outstandingCompany')
                : t('offlineEngagement.outstandingDate')}
          </span>
          <Icon name="pen-to-square" style="solid" className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {/* Emoji glyph, matching the 🗓️ used by the appraisal-date chip beside it — the Icon
              component renders a different weight and colour and looked out of place next to it. */}
          <span className="text-sm leading-none">🏢</span>
          <span>{t('offlineEngagement.companyLabel')}</span>
          <span className="font-semibold text-gray-700">{companyName}</span>
          {canEdit && (
            <button
              type="button"
              onClick={editDialog.onOpen}
              title={t('offlineEngagement.title')}
              className="ml-0.5 p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
            >
              <Icon name="pen-to-square" style="solid" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <Modal
        isOpen={editDialog.isOpen}
        onClose={editDialog.onClose}
        title={t('offlineEngagement.title')}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <Icon
              name="circle-info"
              style="solid"
              className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
            />
            <p className="text-xs text-amber-700">{t('offlineEngagement.hint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('offlineEngagement.companyLabel')} <span className="text-danger">*</span>
            </label>
            {selectedCompany ? (
              <CompanyDisplay
                company={selectedCompany}
                onClear={() => {
                  setSelectedCompany(null);
                  markDirty();
                }}
              />
            ) : (
              <button
                type="button"
                onClick={companyModal.onOpen}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
              >
                <Icon name="magnifying-glass" style="solid" className="size-4 mr-2 inline" />
                {t('offlineEngagement.selectCompany')}
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('offlineEngagement.bookDateLabel')} <span className="text-danger">*</span>
            </label>
            {/* The book is already in hand, so a future date is always wrong. The backend validator
                rejects it too; this stops it being entered in the first place. */}
            <DatePickerInput
              value={bookDate}
              onChange={value => {
                setBookDate(value ?? null);
                markDirty();
              }}
              name="bookDate"
              disableFutureDates
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={editDialog.onClose}>
              {t('offlineEngagement.done')}
            </Button>
          </div>
        </div>
      </Modal>

      <SearchCompanyModal
        isOpen={companyModal.isOpen}
        onClose={companyModal.onClose}
        onSelect={company => {
          setSelectedCompany(company);
          markDirty();
          companyModal.onClose();
        }}
        eligibleCompanies={eligibleCompanies}
      />
    </>
  );
};

export default ValuationEngagementChips;
