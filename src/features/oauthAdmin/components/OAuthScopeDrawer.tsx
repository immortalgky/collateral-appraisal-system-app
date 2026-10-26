import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/inputs/Textarea';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import { useCreateScope, useUpdateScope } from '../api/oauthScopes';
import { splitList } from '../utils/textParse';
import type { OAuthScope } from '../types';
import PanelSection from './PanelSection';
import Tag from './Tag';

interface OAuthScopeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** The scope being edited; null registers a new one. */
  scope: OAuthScope | null;
  /** Display names of the clients holding this scope (edit only). */
  usedBy: string[];
  /** Whether `usedBy` is trustworthy yet; deleting is held back until it is. */
  usageKnown: boolean;
  onRequestDelete: (scope: OAuthScope) => void;
}

const CLIENTS_ROUTE = '/admin/oauth-clients';

const OAuthScopeDrawer = ({
  isOpen,
  onClose,
  scope,
  usedBy,
  usageKnown,
  onRequestDelete,
}: OAuthScopeDrawerProps) => {
  const { t } = useTranslation('oauthAdmin');
  const isEdit = scope !== null;

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [resources, setResources] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const createMutation = useCreateScope();
  const updateMutation = useUpdateScope();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const handleClose = () => {
    if (!isPending) onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    setName(scope?.name ?? '');
    setDisplayName(scope?.displayName ?? '');
    setDescription(scope?.description ?? '');
    setResources(scope?.resources ?? []);
    setDraft('');
    // Key on the id, not the object: a background refetch of the list passes a new object with the
    // same id and must not wipe what the admin has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scope?.id]);

  // Pasted "a b, c" becomes three tags; duplicates are ignored.
  const commitDraft = () => {
    const added = splitList(draft);
    if (added.length > 0) setResources(prev => [...new Set([...prev, ...added])]);
    setDraft('');
  };

  const onDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '') {
      setResources(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = () => {
    const request = {
      displayName: displayName || undefined,
      description: description || undefined,
      resources,
    };
    if (isEdit) {
      updateMutation.mutate({ id: scope.id, request }, { onSuccess: onClose });
    } else {
      createMutation.mutate({ ...request, name: name.trim() }, { onSuccess: onClose });
    }
  };

  const canSubmit = isEdit || name.trim() !== '';
  const inUse = usedBy.length > 0;
  const blockedTitle = inUse
    ? t('scopes.deleteBlocked', { clients: usedBy.join(', ') })
    : undefined;

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      width="lg"
      title={
        isEdit ? <span className="font-mono">{scope.name}</span> : t('scopes.drawer.createTitle')
      }
      subtitle={
        isEdit
          ? usageKnown
            ? t('scopes.drawer.usedByCount', { count: usedBy.length })
            : undefined
          : t('scopes.drawer.createSubtitle')
      }
      footer={
        <div className="flex items-center gap-2">
          {isEdit && (
            <span title={blockedTitle}>
              <Button
                variant="dangerOutline"
                onClick={() => onRequestDelete(scope)}
                disabled={isPending || !usageKnown || inUse}
              >
                {t('scopes.drawer.delete')}
              </Button>
            </span>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            {t('scopes.drawer.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            isLoading={isPending}
            leftIcon={
              isEdit ? <Icon name="check" style="regular" className="text-sm" /> : undefined
            }
          >
            {isEdit ? t('scopes.drawer.save') : t('scopes.drawer.create')}
          </Button>
        </div>
      }
    >
      <fieldset disabled={isPending} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 pb-2">
        <PanelSection title={t('scopes.drawer.sections.info')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('scopes.drawer.name')}
              required={!isEdit}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('scopes.drawer.namePlaceholder')}
              disabled={isEdit}
              readOnly={isEdit}
              helperText={isEdit ? t('scopes.drawer.nameFixed') : undefined}
              className="font-mono"
            />
            <Input
              label={t('scopes.drawer.displayName')}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
          {!isEdit && (
            <p className="-mt-1 text-xs text-(--palette-ink-2)">{t('scopes.drawer.nameHint')}</p>
          )}
          <Textarea
            label={t('scopes.drawer.description')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={1000}
          />
        </PanelSection>

        <PanelSection title={t('scopes.drawer.sections.resources')}>
          <div>
            <label
              htmlFor="scope-resource-input"
              className="mb-1 block text-xs font-medium text-(--palette-ink)"
            >
              {t('scopes.drawer.resources')}
            </label>
            {/* The wrapper draws the field box and focus ring; the input inside is borderless. */}
            <div className="flex min-h-ctl flex-wrap items-center gap-1.5 rounded-ctl border border-(--palette-input-edge) bg-(--form-input-bg) px-2 py-1 focus-within:border-(--focus-edge) focus-within:ring-[3px] focus-within:ring-(color:--focus-ring)">
              {resources.map(resource => (
                <span
                  key={resource}
                  className="inline-flex items-center gap-1 rounded-md bg-(--palette-surface-3) py-0.5 pr-1 pl-2 font-mono text-xs text-(--palette-ink)"
                >
                  {resource}
                  <button
                    type="button"
                    onClick={() => setResources(prev => prev.filter(r => r !== resource))}
                    aria-label={t('scopes.drawer.removeResource', { name: resource })}
                    title={t('scopes.drawer.removeResource', { name: resource })}
                    className="inline-flex size-4 items-center justify-center rounded text-(--palette-ink-2) hover:bg-(--palette-line-soft) hover:text-(--palette-ink)"
                  >
                    <Icon name="xmark" style="regular" className="text-xs" />
                  </button>
                </span>
              ))}
              <input
                id="scope-resource-input"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={onDraftKeyDown}
                onBlur={commitDraft}
                placeholder={t('scopes.drawer.resourcesPlaceholder')}
                className="min-w-32 flex-1 bg-transparent text-sm text-(--palette-ink) outline-none placeholder:text-(--palette-ink-2)"
              />
            </div>
            <p className="mt-1 text-xs text-(--palette-ink-2)">
              {t('scopes.drawer.resourcesHint')}
            </p>
          </div>
        </PanelSection>

        {isEdit && (
          <PanelSection title={t('scopes.drawer.sections.usedBy')}>
            {usageKnown && usedBy.length === 0 ? (
              <p className="text-xs text-(--palette-ink-2)">{t('scopes.drawer.noClients')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {usedBy.map(client => (
                  <Link key={client} to={CLIENTS_ROUTE} className="hover:opacity-80">
                    <Tag>{client}</Tag>
                  </Link>
                ))}
              </div>
            )}
            {inUse && (
              <p className="-mt-1 text-xs text-(--palette-ink-2)">
                {t('scopes.drawer.usedByHint')}
              </p>
            )}
          </PanelSection>
        )}
      </fieldset>
    </SlideOverPanel>
  );
};

export default OAuthScopeDrawer;
