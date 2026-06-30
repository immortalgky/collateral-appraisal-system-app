import { useMemo } from 'react';
import Icon from '@shared/components/Icon';
import { useParameterOptions } from '@/shared/utils/parameterUtils';
import type { DocumentRequirementDto } from '../types';

export interface RequirementScope {
  propertyTypeCode: string | null;
  purposeCode: string | null;
}

interface ScopeGroup extends RequirementScope {
  total: number;
  requiredCount: number;
}

interface Props {
  requirements: DocumentRequirementDto[];
  isLoading?: boolean;
  onEdit: (scope: RequirementScope) => void;
  onDelete: (scope: ScopeGroup) => void;
}

const norm = (v: string | null | undefined) => (v ? v : null);

export default function DocumentRequirementTable({
  requirements,
  isLoading,
  onEdit,
  onDelete,
}: Props) {
  const collateralOptions = useParameterOptions('CollateralType');
  const purposeOptions = useParameterOptions('AppraisalPurpose');

  const collateralMap = useMemo(
    () => new Map(collateralOptions.map(o => [o.value, o.label])),
    [collateralOptions],
  );
  const purposeMap = useMemo(
    () => new Map(purposeOptions.map(o => [o.value, o.label])),
    [purposeOptions],
  );

  // One row per (collateral type, purpose) scope.
  const groups = useMemo<ScopeGroup[]>(() => {
    const map = new Map<string, ScopeGroup>();
    for (const r of requirements) {
      const pt = norm(r.propertyTypeCode);
      const pp = norm(r.purposeCode);
      const key = `${pt ?? ''}|${pp ?? ''}`;
      const g =
        map.get(key) ?? { propertyTypeCode: pt, purposeCode: pp, total: 0, requiredCount: 0 };
      g.total += 1;
      if (r.isRequired) g.requiredCount += 1;
      map.set(key, g);
    }
    return [...map.values()].sort(
      (a, b) =>
        (a.propertyTypeCode ?? '').localeCompare(b.propertyTypeCode ?? '') ||
        (a.purposeCode ?? '').localeCompare(b.purposeCode ?? ''),
    );
  }, [requirements]);

  const collateralLabel = (code: string | null) =>
    code ? `${code} - ${collateralMap.get(code) ?? ''}` : 'Any';
  const purposeLabel = (code: string | null) =>
    code ? `${code} - ${purposeMap.get(code) ?? ''}` : 'Any';

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }

  if (groups.length === 0) {
    return <div className="p-8 text-center text-gray-500">No requirements configured.</div>;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
        <tr>
          <th className="px-4 py-3">Collateral Type</th>
          <th className="px-4 py-3">Purpose</th>
          <th className="px-4 py-3">Documents</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {groups.map(g => (
          <tr key={`${g.propertyTypeCode ?? ''}|${g.purposeCode ?? ''}`}>
            <td className="px-4 py-3 text-gray-700">{collateralLabel(g.propertyTypeCode)}</td>
            <td className="px-4 py-3 text-gray-700">{purposeLabel(g.purposeCode)}</td>
            <td className="px-4 py-3 text-gray-600">
              {g.total} {g.total === 1 ? 'document' : 'documents'}
              <span className="text-gray-400"> · {g.requiredCount} required</span>
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onEdit({ propertyTypeCode: g.propertyTypeCode, purposeCode: g.purposeCode })}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label="Edit"
                >
                  <Icon name="pen" style="regular" className="size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(g)}
                  className="text-gray-400 hover:text-danger"
                  aria-label="Delete"
                >
                  <Icon name="trash" style="regular" className="size-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
