import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import { formatDate } from '@shared/utils/dateUtils';
import { useSetAccessWindow } from '../api/users';
import type { SetAccessWindowResponse } from '../types';

interface AccessWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  /** Longest window a preset/custom end may create, in hours (from the password policy). */
  maxAccessWindowHours: number;
  /** Current window end when one is open — drives "open" vs "extend" copy, presets, and baseline. */
  currentExpiresAt: string | null;
  /** Called with the server response so the caller can show the one-time password when issued. */
  onSuccess: (response: SetAccessWindowResponse) => void;
}

// All presets are expressed in minutes-from-baseline: for a fresh open the baseline is now,
// for an extend it's the current expiry — see `computeEnd` below.
const OPEN_PRESET_MINUTES = [60, 120, 240, 480, 1440];
const EXTEND_PRESET_MINUTES = [30, 60, 120, 240];

const emptyState = { customEnd: '', reason: '' };

const AccessWindowModal = ({
  isOpen,
  onClose,
  userId,
  maxAccessWindowHours,
  currentExpiresAt,
  onSuccess,
}: AccessWindowModalProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const setAccessWindow = useSetAccessWindow();

  const isExtend = !!currentExpiresAt && new Date(currentExpiresAt).getTime() > Date.now();
  const presetOptions = isExtend ? EXTEND_PRESET_MINUTES : OPEN_PRESET_MINUTES;

  const [choice, setChoice] = useState<number | 'custom'>(presetOptions[0]);
  const [customEnd, setCustomEnd] = useState(emptyState.customEnd);
  const [reason, setReason] = useState(emptyState.reason);

  const handleClose = () => {
    setChoice(presetOptions[0]);
    setCustomEnd(emptyState.customEnd);
    setReason(emptyState.reason);
    onClose();
  };

  // Extending is relative to the current expiry so the window keeps sliding forward;
  // opening fresh is relative to now.
  const baseline = isExtend && currentExpiresAt ? new Date(currentExpiresAt) : new Date();

  const computeEnd = (minutes: number) => new Date(baseline.getTime() + minutes * 60_000);

  const selectedEnd: Date | null =
    choice === 'custom' ? (customEnd ? new Date(customEnd) : null) : computeEnd(choice);

  const capMs = maxAccessWindowHours * 60 * 60 * 1000;
  const exceedsCap = (end: Date) => end.getTime() - Date.now() > capMs;

  const nowLocal = formatDate(new Date(), 'yyyy-MM-ddTHH:mm');
  const capEndLocal = formatDate(new Date(Date.now() + capMs), 'yyyy-MM-ddTHH:mm');

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error(t('accessWindow.reasonRequired'));
      return;
    }
    if (!selectedEnd) {
      toast.error(t('accessWindow.selectEndRequired'));
      return;
    }
    // The server has the final say — this just avoids a round trip for the common mistake.
    if (exceedsCap(selectedEnd)) {
      toast.error(t('accessWindow.exceedsCap', { hours: maxAccessWindowHours }));
      return;
    }

    setAccessWindow.mutate(
      {
        id: userId,
        expiresAt: formatDate(selectedEnd, 'yyyy-MM-ddTHH:mm:ss'),
        reason: reason.trim(),
        extendOnly: isExtend,
      },
      {
        onSuccess: data => {
          toast.success(
            isExtend ? t('toasts.accessWindowExtended') : t('toasts.accessWindowOpened'),
          );
          onSuccess(data);
          handleClose();
        },
        onError: (err: any) =>
          toast.error(err?.apiError?.detail || err?.apiError?.title || t('toasts.accessWindowFailed')),
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isExtend ? t('accessWindow.extendTitle') : t('accessWindow.openTitle')}
      size="sm"
    >
      <div className="flex flex-col gap-4 p-6">
        {isExtend && (
          <p className="text-xs text-gray-500">{t('accessWindow.extendPasswordUnchanged')}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {t('accessWindow.durationLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {presetOptions.map(minutes => {
              const disabled = exceedsCap(computeEnd(minutes));
              const label = isExtend
                ? minutes < 60
                  ? t('accessWindow.extendMinutesChip', { count: minutes })
                  : t('accessWindow.extendHoursChip', { count: minutes / 60 })
                : t('accessWindow.hoursChip', { count: minutes / 60 });
              return (
                <button
                  key={minutes}
                  type="button"
                  disabled={disabled}
                  onClick={() => setChoice(minutes)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
                    choice === minutes
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                  )}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setChoice('custom')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
                choice === 'custom'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {t('accessWindow.customChip')}
            </button>
          </div>
        </div>

        {choice === 'custom' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('accessWindow.customEndLabel')}
            </label>
            <input
              type="datetime-local"
              value={customEnd}
              min={isExtend ? formatDate(baseline, 'yyyy-MM-ddTHH:mm') : nowLocal}
              max={capEndLocal}
              onChange={e => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        )}

        <p className="text-xs text-gray-400">
          {t('accessWindow.capNote', { hours: maxAccessWindowHours })}
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('accessWindow.reasonLabel')} <span className="text-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder={t('accessWindow.reasonPlaceholder')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 px-6 pb-6">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          isLoading={setAccessWindow.isPending}
          onClick={handleSubmit}
        >
          {isExtend ? t('accessWindow.extendButton') : t('accessWindow.openButton')}
        </Button>
      </div>
    </Modal>
  );
};

export default AccessWindowModal;
