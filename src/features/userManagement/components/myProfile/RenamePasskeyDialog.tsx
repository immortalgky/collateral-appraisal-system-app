import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import { PASSKEY_NAME_MAX, useRenamePasskey, validPasskeyName } from '../../api/passkeys';
import {
  PASSKEY_NAME_INVALID,
  passkeyErrorCode,
  usePasskeyErrorMessage,
} from '../../api/passkeyErrors';
import type { Passkey } from '../../types';

/**
 * Rename one passkey. `passkey` stays set after the dialog closes (so the content does not change
 * while it fades out); give the dialog a new `key` each time it is opened, so the field starts from
 * the current name.
 */
const RenamePasskeyDialog = ({
  passkey,
  isOpen,
  onClose,
}: {
  passkey: Passkey | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const errorMessage = usePasskeyErrorMessage();
  const renamePasskey = useRenamePasskey();
  const [name, setName] = useState(passkey?.name ?? '');
  // 'field' is about the name and shown on the field; 'error' is anything else that went wrong.
  const [notice, setNotice] = useState<{ tone: 'field' | 'error'; text: string } | null>(null);

  const trimmed = name.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passkey || renamePasskey.isPending) return;
    if (!validPasskeyName(trimmed)) {
      setNotice({ tone: 'field', text: t('passkeys.errors.nameInvalid') });
      return;
    }
    try {
      await renamePasskey.mutateAsync({ id: passkey.id, name: trimmed });
      toast.success(t('passkeys.toasts.renamed'));
      onClose();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        // Deleted elsewhere meanwhile: nothing left to rename. The list refreshes (onSettled).
        toast.error(t('passkeys.toasts.renameGone'));
        onClose();
        return;
      }
      setNotice({
        tone: passkeyErrorCode(err) === PASSKEY_NAME_INVALID ? 'field' : 'error',
        text: errorMessage(err, t('passkeys.toasts.renameFailed')),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!passkey}
      onClose={() => !renamePasskey.isPending && onClose()}
      title={t('passkeys.rename.title')}
      size="sm"
      showCloseButton={!renamePasskey.isPending}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('passkeys.add.nameLabel')}
          type="text"
          autoComplete="off"
          autoFocus // eslint-disable-line jsx-a11y/no-autofocus -- the dialog exists only to edit this name
          maxLength={PASSKEY_NAME_MAX}
          value={name}
          onChange={e => {
            setName(e.target.value);
            setNotice(null);
          }}
          error={notice?.tone === 'field' ? notice.text : undefined}
        />
        {/* The Input's error text is not a live region; this mirrors it for screen readers. */}
        {notice?.tone === 'field' && (
          <p role="alert" className="sr-only">
            {notice.text}
          </p>
        )}
        {notice?.tone === 'error' && (
          <p role="alert" className="text-sm text-danger">
            {notice.text}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={renamePasskey.isPending} onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={renamePasskey.isPending}
            disabled={!trimmed || trimmed === passkey?.name}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RenamePasskeyDialog;
