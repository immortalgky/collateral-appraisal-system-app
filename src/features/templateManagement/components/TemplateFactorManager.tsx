import { useState } from 'react';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import SectionHeader from '@shared/components/sections/SectionHeader';
import AddFactorModal from './AddFactorModal';
import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';
import clsx from 'clsx';

interface TemplateFactor {
  templateFactorId?: string;
  id?: string;
  factorId: string;
  displaySequence: number;
  isMandatory: boolean;
  defaultWeight?: number | null;
}

interface TemplateFactorManagerProps {
  factors: TemplateFactor[];
  allFactors: MarketComparableFactorDtoType[];
  onAddFactor: (selections: { factorId: string; isMandatory: boolean }[]) => void;
  onRemoveFactor: (factorId: string) => void;
  onToggleMandatory?: (factorId: string, isMandatory: boolean) => void;
  isAdding?: boolean;
  isRemoving?: boolean;
  isUpdating?: boolean;
  showDefaultWeight?: boolean;
}

const TemplateFactorManager = ({
  factors,
  allFactors,
  onAddFactor,
  onRemoveFactor,
  onToggleMandatory,
  isAdding,
  isRemoving,
  isUpdating,
  showDefaultWeight = false,
}: TemplateFactorManagerProps) => {
  const [showModal, setShowModal] = useState(false);

  const factorMap = new Map(allFactors.map((f) => [f.id, f]));
  const assignedFactorIds = factors.map((f) => f.factorId);

  const sortedFactors = [...factors].sort((a, b) => a.displaySequence - b.displaySequence);

  return (
    <div>
      <SectionHeader
        title="Template Factors"
        subtitle={`${factors.length} factor(s) assigned`}
        icon="layer-group"
        iconColor="purple"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Add Factor
          </Button>
        }
      />

      {sortedFactors.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg mt-3">
          <Icon name="layer-group" style="regular" className="size-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">No factors assigned yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Factor" to assign factors from the master list</p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="table w-full">
            <thead>
              <tr className="bg-primary/10">
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center first:rounded-tl-lg w-16">#</th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Code</th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Name</th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Mandatory</th>
                {showDefaultWeight && (
                  <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Default Weight</th>
                )}
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedFactors.map((tf) => {
                const factorInfo = factorMap.get(tf.factorId);
                return (
                  <tr key={tf.factorId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-500 text-center">{tf.displaySequence}</td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-700">
                      {factorInfo?.factorCode ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {factorInfo?.factorName ?? 'Unknown Factor'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {onToggleMandatory ? (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onToggleMandatory(tf.factorId, !tf.isMandatory)}
                          className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors',
                            tf.isMandatory
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                            isUpdating && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          {tf.isMandatory ? 'Yes' : 'No'}
                        </button>
                      ) : (
                        <span
                          className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            tf.isMandatory
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-500',
                          )}
                        >
                          {tf.isMandatory ? 'Yes' : 'No'}
                        </span>
                      )}
                    </td>
                    {showDefaultWeight && (
                      <td className="py-3 px-4 text-sm text-gray-600 text-center">
                        {tf.defaultWeight != null ? tf.defaultWeight : '-'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={isRemoving}
                        onClick={() => onRemoveFactor(tf.factorId)}
                        leftIcon={<Icon name="trash-can" style="regular" className="size-3.5 text-danger" />}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddFactorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        factors={allFactors}
        excludeFactorIds={assignedFactorIds}
        onAdd={(selections) => {
          onAddFactor(selections);
          setShowModal(false);
        }}
        isAdding={isAdding}
      />
    </div>
  );
};

export default TemplateFactorManager;
