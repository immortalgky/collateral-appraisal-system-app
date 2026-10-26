import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/inputs';
import { documentTypeLabel, useGetDocumentTypes } from '../api/documentTypes';

interface AddTitleDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The type is chosen: the caller opens the file picker in this same click. */
  onChoose: (documentType: string) => void;
}

/**
 * The type choice for a document added to a title beyond the ones it is asked for. The types are the
 * ones the main card's "attach documents" dialog offers (SUBMIT_DOC): there is no list per collateral
 * type, and the API takes any type on a title.
 */
const AddTitleDocumentModal = ({ isOpen, onClose, onChoose }: AddTitleDocumentModalProps) => {
  const { t } = useTranslation(['request', 'common']);
  const { data: types = [], isLoading } = useGetDocumentTypes('SUBMIT_DOC');
  const [code, setCode] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('docCard.addOther.title')} compact>
      <div className="space-y-4">
        <p className="m-0 text-sm text-(--palette-gray-600)">{t('docCard.addOther.description')}</p>
        <Dropdown
          showValuePrefix={false}
          disabled={isLoading}
          placeholder={
            isLoading ? t('fileAssignment.loadingTypes') : t('fileAssignment.selectType')
          }
          options={types.map(type => ({ value: type.code, label: documentTypeLabel(type) }))}
          value={code}
          onChange={setCode}
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" size="sm" disabled={!code} onClick={() => onChoose(code)}>
            {t('docCard.addOther.chooseFiles')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddTitleDocumentModal;
