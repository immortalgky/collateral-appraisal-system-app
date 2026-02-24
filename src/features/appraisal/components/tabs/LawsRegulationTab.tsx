import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import FormCard from '@shared/components/sections/FormCard';
import { useParameterDescription } from '@shared/utils/parameterUtils';
import { useGetLawAndRegulations, useSaveLawAndRegulations } from '@features/appraisal/api';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import type { LawAndRegulationDtoType } from '@shared/schemas/v1';

const LAW_HEADER_GROUP = 'LAW_HEADER';

/** Resolve headerCode → label via parameter store */
const ItemHeaderLabel = ({ headerCode }: { headerCode: string }) => {
  const label = useParameterDescription(LAW_HEADER_GROUP, headerCode);
  return <>{label}</>;
};

interface ItemRowProps {
  item: LawAndRegulationDtoType;
  onClick: () => void;
  onDelete: () => void;
}

const ItemRow = ({ item, onClick, onDelete }: ItemRowProps) => {
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
    >
      {/* Link icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
        <Icon name="link" className="text-blue-600" style="solid" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          <ItemHeaderLabel headerCode={item.headerCode} />
        </p>
        {item.remark && (
          <p className="text-xs text-gray-500 line-clamp-1">{item.remark}</p>
        )}
      </div>

      {/* Delete button (visible on hover) */}
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Icon name="trash" style="regular" className="w-4 h-4" />
      </button>

      {/* External link icon */}
      <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
    </div>
  );
};

export const LawsRegulationTab = () => {
  const navigate = useNavigate();
  const { appraisalId } = useParams<{ appraisalId: string }>();

  const { data, isLoading } = useGetLawAndRegulations(appraisalId);
  const saveMutation = useSaveLawAndRegulations();

  const items = data?.items ?? [];

  const [deleteTarget, setDeleteTarget] = useState<LawAndRegulationDtoType | null>(null);

  const handleCreate = () => {
    navigate(`/appraisal/${appraisalId}/property/law-and-regulation/new`);
  };

  const handleItemClick = (item: LawAndRegulationDtoType) => {
    navigate(`/appraisal/${appraisalId}/property/law-and-regulation/${item.id}`);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget || !appraisalId) return;

    const remaining = items.filter(i => i.id !== deleteTarget.id);
    saveMutation.mutate(
      {
        appraisalId,
        items: remaining.map(i => ({
          id: i.id,
          headerCode: i.headerCode,
          remark: i.remark,
          images: i.images.map(img => ({
            id: img.id,
            documentId: img.documentId,
            displaySequence: img.displaySequence,
            fileName: img.fileName,
            filePath: img.filePath,
            title: img.title,
            description: img.description,
          })),
        })),
      },
      {
        onSuccess: () => {
          toast.success('Item deleted successfully');
          setDeleteTarget(null);
        },
        onError: () => {
          toast.error('Failed to delete item');
          setDeleteTarget(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Laws & Regulations</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Relevant laws and regulations for property appraisal
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Icon name="plus" style="solid" className="w-3.5 h-3.5 mr-1.5" />
          Add
        </Button>
      </div>

      {/* Regulations Reference card */}
      {items.length === 0 ? (
        <FormCard
          title="Regulations Reference"
          subtitle="Relevant laws and regulations"
          icon="gavel"
          iconColor="amber"
        >
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Icon name="gavel" style="solid" className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No items yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Click the Add button to create a new law & regulation entry.
            </p>
          </div>
        </FormCard>
      ) : (
        <FormCard
          title="Regulations Reference"
          subtitle="Relevant laws and regulations"
          icon="gavel"
          iconColor="amber"
        >
          <div className="space-y-1">
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </div>
        </FormCard>
      )}

      {/* Delete confirmation */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Law & Regulation"
        message="Are you sure you want to delete this item? This action cannot be undone."
        isLoading={saveMutation.isPending}
      />
    </div>
  );
};

export default LawsRegulationTab;
