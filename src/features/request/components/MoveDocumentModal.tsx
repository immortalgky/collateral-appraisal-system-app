import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';

export interface MoveTargetSection {
  entityType: 'request' | 'title';
  entityIndex: number;
  label: string;
}

interface MoveDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Selectable destinations (current section already excluded by the caller). */
  targets: MoveTargetSection[];
  onConfirm: (target: MoveTargetSection) => void;
}

const sectionKey = (s: MoveTargetSection) => `${s.entityType}|${s.entityIndex}`;

const MoveDocumentModal: React.FunctionComponent<MoveDocumentModalProps> = ({
  isOpen,
  onClose,
  targets,
  onConfirm,
}) => {
  const { t } = useTranslation(['request', 'common']);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const handleConfirm = () => {
    const target = targets.find(s => sectionKey(s) === selectedKey);
    if (!target) return;
    onConfirm(target);
  };

  const handleClose = () => {
    setSelectedKey(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('moveDocument.modalTitle')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t('moveDocument.description')}</p>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {targets.map(section => {
            const key = sectionKey(section);
            const isSelected = key === selectedKey;
            return (
              <label
                key={key}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <input
                  type="radio"
                  name="move-target"
                  value={key}
                  checked={isSelected}
                  onChange={() => setSelectedKey(key)}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary cursor-pointer"
                />
                <span className="text-sm text-gray-800">{section.label}</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!selectedKey}>
            {t('moveDocument.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MoveDocumentModal;
