import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useSendShortlistToRm } from '../api/quotation';

interface SendToRmModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  shortlistedCount: number;
}

const SendToRmModal = ({ isOpen, onClose, quotationId, shortlistedCount }: SendToRmModalProps) => {
  const { t } = useTranslation(['quotation', 'common']);
  const { mutate: sendToRm, isPending } = useSendShortlistToRm(quotationId);

  const handleConfirm = () => {
    sendToRm(undefined, {
      onSuccess: () => {
        toast.success(t('toasts.shortlistSentToRm'));
        onClose();
      },
      onError: (err: any) => {
        toast.error(err?.apiError?.detail ?? t('toasts.sendToRmFailed'));
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('shortlist.sendToRmTitle')} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
          <Icon
            name="circle-info"
            style="solid"
            className="size-5 text-purple-500 shrink-0 mt-0.5"
          />
          <div className="text-sm text-purple-700">
            <p className="font-medium mb-1">{t('shortlist.sendToRmConfirm')}</p>
            <p
              dangerouslySetInnerHTML={{
                __html: t('shortlist.sendToRmBody', {
                  count: `<strong>${shortlistedCount}</strong>`,
                }),
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                {t('shortlist.sending')}
              </>
            ) : (
              <>
                <Icon name="paper-plane" style="solid" className="size-4 mr-2" />
                {t('buttons.sendToRm')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendToRmModal;
