import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import { useCreateClient, useGetClient, useUpdateClient } from '../api/oauthClients';
import { GRANT_TYPES, type ClientType, type CreateClientResponse, type GrantType } from '../types';
import { splitLines, splitList } from '../utils/textParse';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** OpenIddict id when editing; null when registering a new client. */
  editId: string | null;
  /** Fired after a successful create so the parent can reveal the one-time secret. */
  onCreated: (response: CreateClientResponse) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

const OAuthClientFormModal = ({ isOpen, onClose, editId, onCreated }: Props) => {
  const { t } = useTranslation('oauthAdmin');
  const isEdit = editId !== null;

  const { data: detail } = useGetClient(isEdit ? editId : null);

  const [displayName, setDisplayName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientType, setClientType] = useState<ClientType>('confidential');
  const [grantTypes, setGrantTypes] = useState<GrantType[]>(['authorization_code']);
  const [scopes, setScopes] = useState('');
  const [redirectUris, setRedirectUris] = useState('');
  const [postLogoutRedirectUris, setPostLogoutRedirectUris] = useState('');

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && detail) {
      setDisplayName(detail.displayName);
      setClientId(detail.clientId);
      setClientType(detail.clientType);
      setGrantTypes(detail.grantTypes as GrantType[]);
      setScopes(detail.scopes.join(' '));
      setRedirectUris(detail.redirectUris.join('\n'));
      setPostLogoutRedirectUris(detail.postLogoutRedirectUris.join('\n'));
    } else {
      // Create mode, OR edit mode while the target client's detail is still loading — clear the
      // form so a previously-edited client's values can never linger and be submitted.
      setDisplayName('');
      setClientId('');
      setClientType('confidential');
      setGrantTypes(['authorization_code']);
      setScopes('');
      setRedirectUris('');
      setPostLogoutRedirectUris('');
    }
    // Key on detail?.id, not the detail object: this populates once when the client's detail first
    // loads (and re-runs when the edited id changes), but a later background refetch of the same
    // client won't re-fire and overwrite the user's in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEdit, editId, detail?.id]);

  const toggleGrant = (grant: GrantType) => {
    setGrantTypes(prev =>
      prev.includes(grant) ? prev.filter(g => g !== grant) : [...prev, grant],
    );
  };

  const handleSubmit = () => {
    const common = {
      displayName,
      redirectUris: splitLines(redirectUris),
      postLogoutRedirectUris: splitLines(postLogoutRedirectUris),
      grantTypes,
      scopes: splitList(scopes),
    };

    if (isEdit) {
      updateMutation.mutate({ id: editId, request: common }, { onSuccess: onClose });
    } else {
      createMutation.mutate(
        { ...common, clientId: clientId.trim() || undefined, clientType },
        {
          onSuccess: response => {
            onClose();
            onCreated(response);
          },
        },
      );
    }
  };

  const requiresRedirect = grantTypes.includes('authorization_code');
  const canSubmit =
    displayName.trim() !== '' &&
    grantTypes.length > 0 &&
    (!requiresRedirect || splitLines(redirectUris).length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('clients.form.editTitle') : t('clients.form.createTitle')}
      size="lg"
    >
      <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('clients.form.displayName')}
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
            {t('clients.form.clientId')}
          </label>
          <input
            type="text"
            value={clientId}
            disabled={isEdit}
            onChange={e => setClientId(e.target.value)}
            className={`${inputClass} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          {!isEdit && (
            <p className="mt-1 text-xs text-gray-400">{t('clients.form.clientIdHint')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('clients.form.clientType')}
          </label>
          {isEdit ? (
            <div className={`${inputClass} bg-gray-50 text-gray-500`}>
              {t(`clients.type.${clientType}` as const)}
            </div>
          ) : (
            <div className="flex gap-4">
              {(['confidential', 'public'] as ClientType[]).map(type => (
                <label key={type} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="clientType"
                    checked={clientType === type}
                    onChange={() => setClientType(type)}
                  />
                  {t(`clients.type.${type}` as const)}
                </label>
              ))}
            </div>
          )}
          {!isEdit && (
            <p className="mt-1 text-xs text-gray-400">
              {clientType === 'public'
                ? t('clients.form.clientTypePublicHint')
                : t('clients.form.clientTypeConfidentialHint')}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('clients.form.grantTypes')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GRANT_TYPES.map(grant => (
              <label key={grant} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={grantTypes.includes(grant)}
                  onChange={() => toggleGrant(grant)}
                />
                {t(`clients.grant.${grant}` as const)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('clients.form.scopes')}
          </label>
          <input
            type="text"
            value={scopes}
            onChange={e => setScopes(e.target.value)}
            placeholder="profile email appraisal.read"
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-xs text-gray-400">{t('clients.form.scopesHint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('clients.form.redirectUris')}
          </label>
          <textarea
            value={redirectUris}
            onChange={e => setRedirectUris(e.target.value)}
            rows={2}
            placeholder="https://app.example.com/callback"
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-xs text-gray-400">{t('clients.form.redirectUrisHint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('clients.form.postLogoutRedirectUris')}
          </label>
          <textarea
            value={postLogoutRedirectUris}
            onChange={e => setPostLogoutRedirectUris(e.target.value)}
            rows={2}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          {t('clients.form.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
          {isEdit ? t('clients.form.save') : t('clients.form.create')}
        </Button>
      </div>
    </Modal>
  );
};

export default OAuthClientFormModal;
