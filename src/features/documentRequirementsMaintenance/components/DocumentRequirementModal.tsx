import { useEffect, useMemo, useState } from 'react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Dropdown from '@shared/components/inputs/Dropdown';
import Checkbox from '@shared/components/inputs/Checkbox';
import { useGetDocumentTypes } from '@/features/request/api/documentTypes';
import type { DocumentRequirementDto } from '../types';
import type { SetScopeRequirementsPayload } from '../api/documentRequirements';

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
  const { data: documentTypes = [] } = useGetDocumentTypes();
  const types = useMemo(
    () => documentTypes.map(dt => ({ id: dt.id as string, code: dt.code ?? '', name: dt.name ?? '' })),
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

  // (Re)build the tick state whenever the scope (or its existing rows) changes.
  useEffect(() => {
    const byDoc = new Map(existingForScope.map(r => [r.documentTypeId, r]));
    const next: Record<string, RowState> = {};
    for (const dt of types) {
      const ex = byDoc.get(dt.id);
      next[dt.id] = { included: !!ex, isRequired: ex ? ex.isRequired : true };
    }
    setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingForScope, types]);

  // Reset scope each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setPropertyTypeCode(initialScope?.propertyTypeCode ?? null);
      setPurposeCode(initialScope?.purposeCode ?? null);
    }
  }, [isOpen, initialScope]);

  const includedCount = Object.values(rows).filter(r => r.included).length;

  const scopeHint = !propertyTypeCode && !purposeCode
    ? 'Applies to all requests (application-wide).'
    : propertyTypeCode && purposeCode
      ? 'Applies only to this collateral type AND purpose combination.'
      : propertyTypeCode
        ? 'Applies to this collateral type (any purpose).'
        : 'Applies to this purpose (any collateral type).';

  const handleSave = async () => {
    const items = types
      .filter(dt => rows[dt.id]?.included)
      .map(dt => ({ documentTypeId: dt.id, isRequired: rows[dt.id].isRequired }));
    await onSubmit({ propertyTypeCode: norm(propertyTypeCode), purposeCode: norm(purposeCode), items });
  };

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Document Requirements" size="lg">
      <div className="flex flex-col gap-4">
        {/* Scope selectors */}
        <div className="grid grid-cols-2 gap-4">
          <Dropdown
            label="Collateral Type"
            group="CollateralType"
            placeholder="Any"
            value={propertyTypeCode ?? undefined}
            onChange={v => setPropertyTypeCode(v ?? null)}
          />
          <Dropdown
            label="Purpose"
            group="AppraisalPurpose"
            placeholder="Any"
            value={purposeCode ?? undefined}
            onChange={v => setPurposeCode(v ?? null)}
          />
        </div>
        <p className="-mt-2 text-xs text-gray-500">{scopeHint}</p>

        {/* Document checklist */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
            <span>Documents ({includedCount} selected)</span>
            <span>Required</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {types.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No document types. Add some in the Document Types tab first.
              </div>
            ) : (
              types.map(dt => {
                const row = rows[dt.id] ?? { included: false, isRequired: true };
                return (
                  <div key={dt.id} className="flex items-center justify-between px-4 py-2.5">
                    <Checkbox
                      label={`${dt.code} - ${dt.name}`}
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
