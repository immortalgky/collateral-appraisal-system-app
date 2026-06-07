import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { TextInput } from '@/shared/components/inputs';
import type { BlockReappraisalFilterValues } from '../types';

interface BlockReappraisalFilterDialogProps {
  open: boolean;
  initialValues: BlockReappraisalFilterValues;
  onApply: (values: BlockReappraisalFilterValues) => void;
  onClose: () => void;
}

export function BlockReappraisalFilterDialog({
  open,
  initialValues,
  onApply,
  onClose,
}: BlockReappraisalFilterDialogProps) {
  const { t } = useTranslation(['blockReappraisal', 'common']);
  const [values, setValues] = useState<BlockReappraisalFilterValues>(initialValues);

  useEffect(() => {
    if (open) setValues(initialValues);
  }, [open, initialValues]);

  const handleClear = () => setValues({});

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('filter.title')} size="md">
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-4">
          <TextInput
            label={t('filter.fields.projectName')}
            placeholder={t('filter.placeholders.projectName')}
            value={values.projectName ?? ''}
            onChange={e =>
              setValues(v => ({ ...v, projectName: e.target.value || undefined }))
            }
          />
          <TextInput
            label={t('filter.fields.oldAppraisalNumber')}
            placeholder={t('filter.placeholders.oldAppraisalNumber')}
            value={values.oldAppraisalNumber ?? ''}
            onChange={e =>
              setValues(v => ({ ...v, oldAppraisalNumber: e.target.value || undefined }))
            }
          />
        </section>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            {t('common:actions.clear')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            {t('common:actions.apply')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
