import { useLayoutEffect, useMemo, useState } from 'react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Dropdown from '@shared/components/inputs/Dropdown';
import Checkbox from '@shared/components/inputs/Checkbox';
import { documentTypeLabel, useGetDocumentTypes } from '@/features/request/api/documentTypes';
import type { DocumentRequirementDto } from '../types';
import type { SetScopeRequirementsPayload } from '../api/documentRequirements';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '@shared/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SetScopeRequirementsPayload) => Promise<void>;
  /** All requirements (active) — used to pre-tick the chosen scope. */
  requirements: DocumentRequirementDto[];
  /** Optional initial scope (e.g. when editing an existing row's scope). */
  initialScope?: { propertyTypeCode: string | null; purposeCode: string | null } | null;
  isSaving?: boolean;
}

interface RowState {
  included: boolean;
  isRequired: boolean;
}

const norm = (v: string | null | undefined) => (v ? v : null);

export default function DocumentRequirementModal({
  isOpen,
  onClose,
  onSubmit,
  requirements,
  initialScope,
  isSaving,
}: Props) {
  const { t } = useTranslation('request');
  const language = useLocaleStore(s => s.language);
  const { data: documentTypes, isError, isFetching, refetch } = useGetDocumentTypes();
  // A failed refetch over cached types is not a load failure: the list is still there.
  const loadFailed = isError && !documentTypes;
  const types = useMemo(
    () =>
      (documentTypes ?? []).map(dt => ({
        id: dt.id as string,
        code: dt.code ?? '',
        name: dt.name ?? '',
        nameTh: dt.nameTh ?? '',
      })),
    [documentTypes],
  );

  const [propertyTypeCode, setPropertyTypeCode] = useState<string | null>(null);
  const [purposeCode, setPurposeCode] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  // Compute the existing-active requirements for the currently selected scope.
  const existingForScope = useMemo(
    () =>
      requirements.filter(
        r =>
          r.isActive &&
          norm(r.propertyTypeCode) === norm(propertyTypeCode) &&
          norm(r.purposeCode) === norm(purposeCode),
      ),
    [requirements, propertyTypeCode, purposeCode],
  );

  // (Re)build the tick state whenever the modal opens or the scope (or its existing rows) changes.
  // A layout effect, so the first painted frame after opening already shows the rebuilt ticks.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const byDoc = new Map(existingForScope.map(r => [r.documentTypeId, r]));
    const next: Record<string, RowState> = {};
    for (const dt of types) {
      const ex = byDoc.get(dt.id);
      next[dt.id] = { included: !!ex, isRequired: ex ? ex.isRequired : true };
    }
    setRows(next);
  }, [isOpen, existingForScope, types]);

  // Reset scope each time the modal opens. A layout effect for the same reason as the rebuild above:
  // the first painted frame already shows the new scope.
  useLayoutEffect(() => {
    if (isOpen) {
      setPropertyTypeCode(initialScope?.propertyTypeCode ?? null);
      setPurposeCode(initialScope?.purposeCode ?? null);
    }
  }, [isOpen, initialScope]);

  const includedCount = Object.values(rows).filter(r => r.included).length;

  const scopeHint =
    !propertyTypeCode && !purposeCode
      ? t('documentRequirementAdmin.scope.all')
      : propertyTypeCode && purposeCode
        ? t('documentRequirementAdmin.scope.both')
        : propertyTypeCode
          ? t('documentRequirementAdmin.scope.collateralType')
          : t('documentRequirementAdmin.scope.purpose');

  const handleSave = async () => {
    const items = types
      .filter(dt => rows[dt.id]?.included)
      .map(dt => ({ documentTypeId: dt.id, isRequired: rows[dt.id].isRequired }));
    // The list holds active types only; keep requirements on other types as they are, because the
    // scope is replaced by exactly what is sent.
    const listed = new Set(types.map(dt => dt.id));
    for (const r of existingForScope) {
      if (listed.has(r.documentTypeId)) continue;
      listed.add(r.documentTypeId);
      items.push({ documentTypeId: r.documentTypeId, isRequired: r.isRequired });
    }
    await onSubmit({
      propertyTypeCode: norm(propertyTypeCode),
      purposeCode: norm(purposeCode),
      items,
    });
  };

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('documentRequirementAdmin.title')} size="lg">
      <div className="flex flex-col gap-4">
        {/* Scope selectors */}
        <div className="grid grid-cols-2 gap-4">
          <Dropdown
            label={t('documentRequirementAdmin.fields.collateralType')}
            group="CollateralType"
            placeholder={t('documentRequirementAdmin.any')}
            value={propertyTypeCode ?? undefined}
            onChange={v => setPropertyTypeCode(v ?? null)}
          />
          <Dropdown
            label={t('documentRequirementAdmin.fields.purpose')}
            group="AppraisalPurpose"
            placeholder={t('documentRequirementAdmin.any')}
            value={purposeCode ?? undefined}
            onChange={v => setPurposeCode(v ?? null)}
          />
        </div>
        <p className="-mt-2 text-xs text-(--palette-gray-500)">{scopeHint}</p>

        {/* Document checklist */}
        <div className="border border-(--palette-line) rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-(--palette-surface-2) px-4 py-2 text-xs font-medium text-(--palette-gray-500) uppercase">
            <span>
              {t('documentRequirementAdmin.checklist.documents', { count: includedCount })}
            </span>
            <span>{t('documentRequirementAdmin.checklist.required')}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-(--palette-line-soft)">
            {types.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-(--palette-gray-500)">
                {loadFailed ? (
                  <>
                    {t('documentRequirementAdmin.loadFailed')}{' '}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => refetch()}
                      disabled={isFetching}
                    >
                      {t('documentRequirementAdmin.retry')}
                    </Button>
                  </>
                ) : documentTypes ? (
                  t('documentRequirementAdmin.noTypes')
                ) : (
                  t('documentRequirementAdmin.loadingTypes')
                )}
              </div>
            ) : (
              types.map(dt => {
                const row = rows[dt.id] ?? { included: false, isRequired: true };
                return (
                  <div key={dt.id} className="flex items-center justify-between px-4 py-2.5">
                    <Checkbox
                      label={`${dt.code} - ${documentTypeLabel(dt, language)}`}
                      checked={row.included}
                      onChange={c => setRow(dt.id, { included: c })}
                    />
                    <Checkbox
                      checked={row.isRequired}
                      disabled={!row.included}
                      onChange={c => setRow(dt.id, { isRequired: c })}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-(--palette-line)">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            {t('documentRequirementAdmin.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!documentTypes}
          >
            {t('documentRequirementAdmin.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
