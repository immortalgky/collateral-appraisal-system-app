import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import { useCreateScope, useUpdateScope } from '../api/oauthScopes';
import { splitList } from '../utils/textParse';
import type { OAuthScope } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scope: OAuthScope | null;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

const OAuthScopeFormModal = ({ isOpen, onClose, scope }: Props) => {
  const { t } = useTranslation('oauthAdmin');
  const isEdit = scope !== null;

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [resources, setResources] = useState('');

  const createMutation = useCreateScope();
  const updateMutation = useUpdateScope();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setName(scope?.name ?? '');
    setDisplayName(scope?.displayName ?? '');
    setDescription(scope?.description ?? '');
    setResources(scope?.resources.join(' ') ?? '');
  }, [isOpen, scope]);

  const handleSubmit = () => {
    if (isEdit) {
      updateMutation.mutate(
        {
          id: scope!.id,
          request: {
            displayName: displayName || undefined,
            description: description || undefined,
            resources: splitList(resources),
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(
        {
          name: name.trim(),
          displayName: displayName || undefined,
          description: description || undefined,
          resources: splitList(resources),
        },
        { onSuccess: onClose },
      );
    }
  };

  const canSubmit = isEdit || name.trim() !== '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('scopes.form.editTitle') : t('scopes.form.createTitle')}
      size="md"
    >
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('scopes.form.name')}
          </label>
          <input
            type="text"
            value={name}
            disabled={isEdit}
            onChange={e => setName(e.target.value)}
            placeholder="appraisal.read"
            className={`${inputClass} font-mono ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          <p className="mt-1 text-xs text-gray-400">{t('scopes.form.nameHint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('scopes.form.displayName')}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('scopes.form.description')}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('scopes.form.resources')}
          </label>
          <input
            type="text"
            value={resources}
            onChange={e => setResources(e.target.value)}
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-xs text-gray-400">{t('scopes.form.resourcesHint')}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          {t('scopes.form.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
          {isEdit ? t('scopes.form.save') : t('scopes.form.create')}
        </Button>
      </div>
    </Modal>
  );
};

export default OAuthScopeFormModal;
