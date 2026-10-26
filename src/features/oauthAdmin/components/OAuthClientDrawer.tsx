import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import NativeSelect from '@shared/components/inputs/NativeSelect';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import { FETCH_ALL_SCOPES, useGetScopes } from '../api/oauthScopes';
import { useCreateClient, useGetClient, useUpdateClient } from '../api/oauthClients';
import { useCopied } from '../hooks/useCopied';
import { GRANT_TYPES, type ClientType, type CreateClientResponse, type GrantType } from '../types';
import {
  isLifetimeValid,
  MAX_REFRESH_MINUTES,
  MAX_SHORT_LIVED_MINUTES,
  MAX_UPLOAD_SESSION_DAYS,
  MAX_UPLOAD_SESSION_HOURS,
  STANDARD_SCOPES,
  toHours,
  toOptionalNumber,
  type UploadSessionUnit,
} from '../utils/clientForm';
import ChoiceChip from './ChoiceChip';
import PanelSection from './PanelSection';
import UriListEditor from './UriListEditor';

interface OAuthClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** OpenIddict id when editing; null when registering a new client. */
  editId: string | null;
  /** Fired after a successful create so the parent can reveal the one-time secret. */
  onCreated: (response: CreateClientResponse, displayName: string) => void;
  /** Edit footer / secret box: the page owns the confirm dialogs. */
  onRequestDelete: (client: { id: string; displayName: string }) => void;
  onRequestRotate: (client: { id: string; displayName: string }) => void;
}

const SCOPES_ROUTE = '/admin/oauth-scopes';

const labelClass = 'mb-1 block text-xs font-medium text-(--palette-ink)';
const hintClass = 'mt-1 text-xs text-(--palette-ink-2)';

const clientTypeBadge = (type: ClientType) =>
  type === 'confidential' ? { tone: 'teal' as const } : { variant: 'info' as const };

const OAuthClientDrawer = ({
  isOpen,
  onClose,
  editId,
  onCreated,
  onRequestDelete,
  onRequestRotate,
}: OAuthClientDrawerProps) => {
  const { t } = useTranslation('oauthAdmin');
  const isEdit = editId !== null;

  const { data: detail } = useGetClient(isEdit ? editId : null);
  const scopesQuery = useGetScopes(FETCH_ALL_SCOPES, isOpen);
  const [idCopied, copyId] = useCopied();

  const [displayName, setDisplayName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientType, setClientType] = useState<ClientType>('confidential');
  const [grantTypes, setGrantTypes] = useState<GrantType[]>(['authorization_code']);
  const [scopes, setScopes] = useState<string[]>([]);
  const [redirectUris, setRedirectUris] = useState<string[]>([]);
  const [postLogoutRedirectUris, setPostLogoutRedirectUris] = useState<string[]>([]);
  // Held as strings so a field can be genuinely empty, which means "inherit the server default".
  // Number state would collapse '' to 0 or NaN and lose that distinction.
  const [accessTokenLifetimeMinutes, setAccessTokenLifetimeMinutes] = useState('');
  const [identityTokenLifetimeMinutes, setIdentityTokenLifetimeMinutes] = useState('');
  const [refreshTokenLifetimeMinutes, setRefreshTokenLifetimeMinutes] = useState('');
  const [uploadSessionLifetime, setUploadSessionLifetime] = useState('');
  const [uploadSessionUnit, setUploadSessionUnit] = useState<UploadSessionUnit>('hours');

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isPending = createMutation.isPending || updateMutation.isPending;
  // Not while a request is in flight: Esc, the backdrop, X and Cancel all land here.
  const handleClose = () => {
    if (!isPending) onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && detail) {
      setDisplayName(detail.displayName);
      setClientId(detail.clientId);
      setClientType(detail.clientType);
      setGrantTypes(detail.grantTypes as GrantType[]);
      setScopes(detail.scopes);
      setRedirectUris(detail.redirectUris);
      setPostLogoutRedirectUris(detail.postLogoutRedirectUris);
      setAccessTokenLifetimeMinutes(detail.accessTokenLifetimeMinutes?.toString() ?? '');
      setIdentityTokenLifetimeMinutes(detail.identityTokenLifetimeMinutes?.toString() ?? '');
      setRefreshTokenLifetimeMinutes(detail.refreshTokenLifetimeMinutes?.toString() ?? '');
      // 0 (or anything non-positive) is not a valid stored value; show it as empty, never "0 Days".
      const uploadHours = detail.uploadSessionLifetimeHours ?? 0;
      const inDays = uploadHours > 0 && uploadHours % 24 === 0;
      setUploadSessionLifetime(
        uploadHours > 0 ? String(inDays ? uploadHours / 24 : uploadHours) : '',
      );
      setUploadSessionUnit(inDays ? 'days' : 'hours');
    } else {
      // Create mode, OR edit mode while the target client's detail is still loading — clear the
      // form so a previously-edited client's values can never linger and be submitted.
      setDisplayName('');
      setClientId('');
      setClientType('confidential');
      setGrantTypes(['authorization_code']);
      setScopes([]);
      setRedirectUris([]);
      setPostLogoutRedirectUris([]);
      setAccessTokenLifetimeMinutes('');
      setIdentityTokenLifetimeMinutes('');
      setRefreshTokenLifetimeMinutes('');
      setUploadSessionLifetime('');
      setUploadSessionUnit('hours');
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
  const toggleScope = (scope: string) => {
    setScopes(prev => (prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]));
  };

  const requiresRedirect = grantTypes.includes('authorization_code');
  // Refresh tokens are only issued with the refresh_token grant.
  const refreshEnabled = grantTypes.includes('refresh_token');
  // Only client_credentials callers (external systems) create upload sessions through this route.
  const showUploadSessionLifetime = grantTypes.includes('client_credentials');

  const handleSubmit = () => {
    const common = {
      displayName: displayName.trim(),
      // A hidden section is never cleared by hiding it: echo what is stored (nothing on create),
      // so toggling a grant can neither wipe nor invent URIs.
      redirectUris: requiresRedirect
        ? redirectUris.map(u => u.trim()).filter(Boolean)
        : (detail?.redirectUris ?? []),
      postLogoutRedirectUris: requiresRedirect
        ? postLogoutRedirectUris.map(u => u.trim()).filter(Boolean)
        : (detail?.postLogoutRedirectUris ?? []),
      grantTypes,
      scopes,
      // Empty means "no client-specific value" — send null so the server removes the setting
      // rather than storing something it would silently ignore.
      accessTokenLifetimeMinutes: toOptionalNumber(accessTokenLifetimeMinutes),
      identityTokenLifetimeMinutes: toOptionalNumber(identityTokenLifetimeMinutes),
      refreshTokenLifetimeMinutes: refreshEnabled
        ? toOptionalNumber(refreshTokenLifetimeMinutes)
        : (detail?.refreshTokenLifetimeMinutes ?? null),
      // While the field is hidden (no client_credentials) echo back whatever is stored rather than
      // the form state, so editing another field can never wipe or overwrite it. Create has none.
      uploadSessionLifetimeHours: showUploadSessionLifetime
        ? toHours(uploadSessionLifetime, uploadSessionUnit)
        : (detail?.uploadSessionLifetimeHours ?? null),
    };

    if (isEdit) {
      updateMutation.mutate({ id: editId, request: common }, { onSuccess: onClose });
    } else {
      createMutation.mutate(
        { ...common, clientId: clientId.trim() || undefined, clientType },
        {
          onSuccess: response => {
            onClose();
            onCreated(response, common.displayName);
          },
        },
      );
    }
  };

  const isAccessLifetimeValid = isLifetimeValid(
    accessTokenLifetimeMinutes,
    MAX_SHORT_LIVED_MINUTES,
  );
  const isIdentityLifetimeValid = isLifetimeValid(
    identityTokenLifetimeMinutes,
    MAX_SHORT_LIVED_MINUTES,
  );
  // A disabled or hidden field must never block saving, whatever was typed into it before.
  const isRefreshLifetimeValid =
    !refreshEnabled || isLifetimeValid(refreshTokenLifetimeMinutes, MAX_REFRESH_MINUTES);
  const uploadMaxInUnit =
    uploadSessionUnit === 'days' ? MAX_UPLOAD_SESSION_DAYS : MAX_UPLOAD_SESSION_HOURS;
  const isUploadLifetimeValid =
    !showUploadSessionLifetime || isLifetimeValid(uploadSessionLifetime, uploadMaxInUnit);
  const lifetimesValid =
    isAccessLifetimeValid &&
    isIdentityLifetimeValid &&
    isRefreshLifetimeValid &&
    isUploadLifetimeValid;
  const canSubmit =
    (!isEdit || !!detail) &&
    displayName.trim() !== '' &&
    grantTypes.length > 0 &&
    lifetimesValid &&
    (!requiresRedirect || redirectUris.some(u => u.trim() !== ''));

  // ── Scope chips ────────────────────────────────────────────────────────────
  // Registered scopes first, then any the client holds that are in neither list, so nothing it
  // already has is silently dropped on save. "Unregistered" is only claimed once the list loaded.
  const standard: readonly string[] = STANDARD_SCOPES;
  const registered = (scopesQuery.data?.items ?? [])
    .map(s => s.name)
    .filter(n => !standard.includes(n));
  const unlisted = scopes.filter(s => !standard.includes(s) && !registered.includes(s));
  const customScopes = [...registered, ...unlisted];

  const grantLabel = (grant: GrantType) => t(`clients.grant.${grant}` as const);

  const lifetimeField = (
    id: string,
    label: string,
    value: string,
    setValue: (v: string) => void,
    max: number,
    valid: boolean,
    disabledPlaceholder?: string,
  ) => (
    <Input
      id={id}
      label={label}
      type="text"
      inputMode="numeric"
      value={disabledPlaceholder ? '' : value}
      onChange={e => setValue(e.target.value)}
      placeholder={disabledPlaceholder ?? t('clients.drawer.lifetimeInherit')}
      disabled={!!disabledPlaceholder}
      error={valid ? undefined : t('clients.drawer.lifetimeInvalid', { max })}
      helperText={
        valid && !disabledPlaceholder
          ? t('clients.drawer.lifetimeMax', { max: max.toLocaleString('en-US') })
          : undefined
      }
      rightIcon={
        <span className="text-xs text-(--palette-ink-2)">{t('clients.drawer.minutes')}</span>
      }
      className="pr-14! text-right"
    />
  );

  const lifetimeFields = (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
      {lifetimeField(
        'token-lifetime-access',
        t('clients.drawer.lifetime.access'),
        accessTokenLifetimeMinutes,
        setAccessTokenLifetimeMinutes,
        MAX_SHORT_LIVED_MINUTES,
        isAccessLifetimeValid,
      )}
      {lifetimeField(
        'token-lifetime-identity',
        t('clients.drawer.lifetime.identity'),
        identityTokenLifetimeMinutes,
        setIdentityTokenLifetimeMinutes,
        MAX_SHORT_LIVED_MINUTES,
        isIdentityLifetimeValid,
      )}
      {lifetimeField(
        'token-lifetime-refresh',
        t('clients.drawer.lifetime.refresh'),
        refreshTokenLifetimeMinutes,
        setRefreshTokenLifetimeMinutes,
        MAX_REFRESH_MINUTES,
        isRefreshLifetimeValid,
        refreshEnabled ? undefined : t('clients.drawer.lifetime.refreshOff'),
      )}
      {showUploadSessionLifetime && (
        <div>
          <span id="upload-session-lifetime-label" className={labelClass}>
            {t('clients.drawer.upload.label')}
          </span>
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
            <Input
              // Text, not number: a number input reports malformed text ("1e", "-") as '' which
              // reads as "empty = server default" and would silently clear the stored value.
              type="text"
              inputMode="numeric"
              value={uploadSessionLifetime}
              onChange={e => setUploadSessionLifetime(e.target.value)}
              placeholder={t('clients.drawer.lifetimeInherit')}
              aria-labelledby="upload-session-lifetime-label"
              error={
                isUploadLifetimeValid
                  ? undefined
                  : t('clients.drawer.upload.invalid', {
                      max: uploadMaxInUnit,
                      unit: t(`clients.drawer.upload.unit.${uploadSessionUnit}Inline` as const),
                    })
              }
              className="text-right"
            />
            <NativeSelect
              // Name is "<field label> <unit label>", e.g. "Upload session Unit", so the select is
              // distinguishable from the number input.
              aria-labelledby="upload-session-lifetime-label upload-session-lifetime-unit-label"
              value={uploadSessionUnit}
              onChange={e => setUploadSessionUnit(e.target.value as UploadSessionUnit)}
              className="w-full"
            >
              <option value="hours">{t('clients.drawer.upload.unit.hours')}</option>
              <option value="days">{t('clients.drawer.upload.unit.days')}</option>
            </NativeSelect>
            <span id="upload-session-lifetime-unit-label" className="sr-only">
              {t('clients.drawer.upload.unit.label')}
            </span>
          </div>
          {isUploadLifetimeValid && <p className={hintClass}>{t('clients.drawer.upload.hint')}</p>}
        </div>
      )}
    </div>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      width="xl"
      title={
        isEdit ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {detail?.displayName ?? t('clients.drawer.editTitle')}
            {detail && (
              <Badge size="sm" {...clientTypeBadge(detail.clientType)}>
                {t(`clients.type.${detail.clientType}` as const)}
              </Badge>
            )}
          </span>
        ) : (
          t('clients.drawer.createTitle')
        )
      }
      subtitle={
        isEdit
          ? detail && (
              <>
                {t('clients.drawer.clientIdLabel')}{' '}
                <span className="font-mono text-(--palette-ink)">{detail.clientId}</span>
              </>
            )
          : t('clients.drawer.createSubtitle')
      }
      footer={
        <div className="flex items-center gap-2">
          {isEdit ? (
            detail &&
            !detail.isSystem && (
              <Button
                variant="dangerOutline"
                onClick={() => onRequestDelete(detail)}
                disabled={isPending}
              >
                {t('clients.drawer.delete')}
              </Button>
            )
          ) : (
            <span className="text-xs text-(--palette-ink-2)">{t('clients.drawer.createNote')}</span>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            {t('clients.drawer.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            isLoading={isPending}
            leftIcon={
              isEdit ? <Icon name="check" style="regular" className="text-sm" /> : undefined
            }
          >
            {isEdit ? t('clients.drawer.save') : t('clients.drawer.create')}
          </Button>
        </div>
      }
    >
      {/* One disabled fieldset covers every field while a request is in flight. */}
      <fieldset disabled={isPending} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 pb-2">
        <PanelSection title={t('clients.drawer.sections.general')}>
          {!isEdit && (
            <fieldset>
              <legend className={labelClass}>
                {t('clients.drawer.type')}
                <span className="ml-0.5 text-(--palette-req)">*</span>
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(['confidential', 'public'] as ClientType[]).map(type => (
                  <label
                    key={type}
                    className={clsx(
                      'grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 rounded-lg border px-3 py-2.5',
                      clientType === type
                        ? 'border-primary-700 bg-(--palette-primary-wash)'
                        : 'border-(--palette-input-edge) bg-(--form-input-bg) hover:border-(--palette-input-edge-hover)',
                    )}
                  >
                    <input
                      type="radio"
                      name="oauth-client-type"
                      className="row-span-2 mt-1 size-4 accent-primary-700"
                      checked={clientType === type}
                      onChange={() => setClientType(type)}
                    />
                    <span className="text-sm font-medium text-(--palette-ink)">
                      {t(`clients.type.${type}` as const)}
                    </span>
                    <span className="text-xs text-(--palette-ink-2)">
                      {t(`clients.drawer.typeDesc.${type}` as const)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('clients.drawer.displayName')}
              required={!isEdit}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            {isEdit ? (
              <div>
                <span className={labelClass}>{t('clients.drawer.clientId')}</span>
                <div className="relative">
                  <Input
                    value={clientId}
                    disabled
                    readOnly
                    aria-label={t('clients.drawer.clientId')}
                    className="pr-10! font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => void copyId(clientId)}
                    aria-label={t('clients.drawer.copyClientId')}
                    title={t('clients.drawer.copyClientId')}
                    className="absolute top-1/2 right-1 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-(--palette-ink-2) hover:bg-(--palette-surface-3)"
                  >
                    <Icon name={idCopied ? 'check' : 'copy'} style="regular" className="text-sm" />
                  </button>
                </div>
              </div>
            ) : (
              <Input
                label={t('clients.drawer.clientId')}
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder={t('clients.drawer.clientIdPlaceholder')}
                className="font-mono"
              />
            )}
          </div>
          <p className="-mt-1 text-xs text-(--palette-ink-2)">{t('clients.drawer.fixedHint')}</p>
        </PanelSection>

        {isEdit && detail?.hasSecret && (
          <PanelSection title={t('clients.drawer.sections.secret')}>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-(--palette-line) px-3 py-2.5">
              <span
                className="font-mono tracking-[0.12em] text-(--palette-ink-2)"
                aria-hidden="true"
              >
                ••••••••••••
              </span>
              <Badge tone="green" size="sm" className="whitespace-nowrap">
                {t('clients.drawer.secretSet')}
              </Badge>
              <span className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestRotate(detail)}
                leftIcon={<Icon name="rotate" style="regular" className="text-xs" />}
              >
                {t('clients.drawer.rotate')}
              </Button>
            </div>
            <p className="-mt-1 text-xs text-(--palette-ink-2)">{t('clients.drawer.secretHint')}</p>
          </PanelSection>
        )}

        <PanelSection title={t('clients.drawer.sections.access')}>
          <div>
            <span id="oauth-grant-label" className={labelClass}>
              {t('clients.drawer.grantTypes')}
              {!isEdit && <span className="ml-0.5 text-(--palette-req)">*</span>}
            </span>
            <div role="group" aria-labelledby="oauth-grant-label" className="flex flex-wrap gap-2">
              {GRANT_TYPES.map(grant => (
                <ChoiceChip
                  key={grant}
                  label={grantLabel(grant)}
                  selected={grantTypes.includes(grant)}
                  onToggle={() => toggleGrant(grant)}
                />
              ))}
            </div>
            <p className={hintClass}>{t('clients.drawer.grantHint')}</p>
          </div>

          <div>
            <span id="oauth-scope-label" className={labelClass}>
              {t('clients.drawer.scopes')}
            </span>
            <p className="mb-1.5 text-xs text-(--palette-ink-2)">
              {t('clients.drawer.scopeGroupApp')}
            </p>
            <div role="group" aria-labelledby="oauth-scope-label" className="flex flex-wrap gap-2">
              {customScopes.map(scope => (
                <ChoiceChip
                  key={scope}
                  mono
                  label={scope}
                  title={
                    scopesQuery.isSuccess && unlisted.includes(scope)
                      ? t('clients.drawer.scopeUnregistered', { scope })
                      : scope
                  }
                  selected={scopes.includes(scope)}
                  onToggle={() => toggleScope(scope)}
                />
              ))}
              {customScopes.length === 0 && (
                <span className="text-xs text-(--palette-ink-2)">
                  {t('clients.drawer.noRegisteredScopes')}
                </span>
              )}
            </div>
            <p className="mt-3 mb-1.5 text-xs text-(--palette-ink-2)">
              {t('clients.drawer.scopeGroupStandard')}
            </p>
            <div
              role="group"
              aria-label={t('clients.drawer.scopeGroupStandard')}
              className="flex flex-wrap gap-2"
            >
              {STANDARD_SCOPES.map(scope => (
                <ChoiceChip
                  key={scope}
                  mono
                  label={scope}
                  selected={scopes.includes(scope)}
                  onToggle={() => toggleScope(scope)}
                />
              ))}
            </div>
            <p className={hintClass}>
              {t('clients.drawer.scopePickHint')} ·{' '}
              <Link
                to={SCOPES_ROUTE}
                className="font-medium text-(--palette-primary-text) hover:underline"
              >
                {t('clients.drawer.manageScopes')}
              </Link>
            </p>
          </div>

          {!requiresRedirect && (
            <p className="flex items-center gap-2 rounded-lg bg-(--palette-surface-2) px-3 py-2 text-xs text-(--palette-ink-2)">
              <Icon name="circle-info" style="regular" className="text-sm" />
              {t('clients.drawer.redirectHidden')}
            </p>
          )}
        </PanelSection>

        {requiresRedirect && (
          <PanelSection title={t('clients.drawer.sections.redirect')}>
            <UriListEditor
              label={t('clients.drawer.redirectAfterLogin')}
              ariaLabel={t('clients.drawer.redirectUri')}
              values={redirectUris}
              onChange={setRedirectUris}
              required
              hint={t('clients.drawer.redirectHint')}
            />
            <UriListEditor
              label={t('clients.drawer.redirectAfterLogout')}
              ariaLabel={t('clients.drawer.postLogoutUri')}
              values={postLogoutRedirectUris}
              onChange={setPostLogoutRedirectUris}
            />
          </PanelSection>
        )}

        {isEdit ? (
          <PanelSection title={t('clients.drawer.sections.lifetimes')}>
            {lifetimeFields}
            <p className="-mt-1 text-xs text-(--palette-ink-2)">
              {t('clients.drawer.lifetimeEmpty')}
            </p>
          </PanelSection>
        ) : (
          // Closed by default on create; the fields stay mounted, so nothing typed is lost.
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-(--palette-ink)">
              <Icon
                name="chevron-right"
                style="regular"
                className="text-xs text-(--palette-ink-2) transition-transform group-open:rotate-90"
              />
              {t('clients.drawer.sections.lifetimes')}
              <span
                className={clsx(
                  'text-xs font-normal',
                  lifetimesValid
                    ? 'text-(--palette-ink-2)'
                    : 'text-danger-600 dark:text-(--palette-danger)',
                )}
              >
                {lifetimesValid
                  ? t('clients.drawer.lifetimeDefault')
                  : t('clients.drawer.lifetimeHasInvalid')}
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {lifetimeFields}
              <p className="-mt-1 text-xs text-(--palette-ink-2)">
                {t('clients.drawer.lifetimeEmpty')}
              </p>
            </div>
          </details>
        )}
      </fieldset>
    </SlideOverPanel>
  );
};

export default OAuthClientDrawer;
