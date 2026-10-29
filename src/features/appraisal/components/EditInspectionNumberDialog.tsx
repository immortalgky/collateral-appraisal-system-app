import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import NumberInput from '@/shared/components/inputs/NumberInput';
import { useUpdateInspectionNumber } from '../api/appraisal';

interface EditInspectionNumberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  /** The round number now stored on the appraisal. */
  current: number;
}

interface InspectionNumberFormProps {
  current: number;
  isPending: boolean;
  onCancel: () => void;
  onSave: (inspectionNumber: number) => void;
}

/** The form is the Modal's child, so its value starts from `current` again every time it opens. */
function InspectionNumberForm({ current, isPending, onCancel, onSave }: InspectionNumberFormProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const [value, setValue] = useState<number | null>(current);

  const valid = value != null && Number.isInteger(value) && value >= 1;
  const canSave = valid && value !== current && !isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSave) onSave(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <NumberInput
        label={t('constructionInspection.editRound.label')}
        required
        name="inspectionNumber"
        decimalPlaces={0}
        thousandSeparator={false}
        maxIntegerDigits={4}
        min={1}
        value={value}
        onChange={e => setValue(e.target.value)}
        helperText={t('constructionInspection.editRound.note')}
      />
      <div className="flex justify-end gap-3 pt-4 border-t border-(--palette-line)">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          {t('common:actions.cancel')}
        </Button>
        <Button type="submit" isLoading={isPending} disabled={!canSave}>
          {t('common:actions.save')}
        </Button>
      </div>
    </form>
  );
}

export default function EditInspectionNumberDialog({
  isOpen,
  onClose,
  appraisalId,
  current,
}: EditInspectionNumberDialogProps) {
  const { t } = useTranslation('appraisal');
  const { mutate, isPending } = useUpdateInspectionNumber();

  // While the save is in flight, Esc, the backdrop, the X and Cancel all stay put: closing would
  // look like a cancelled save that still lands.
  const close = () => {
    if (!isPending) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={t('constructionInspection.editRound.title')}
      size="sm"
      compact
      showCloseButton={!isPending}
    >
      <InspectionNumberForm
        current={current}
        isPending={isPending}
        onCancel={close}
        onSave={inspectionNumber =>
          mutate({ appraisalId, inspectionNumber }, { onSuccess: onClose })
        }
      />
    </Modal>
  );
}
