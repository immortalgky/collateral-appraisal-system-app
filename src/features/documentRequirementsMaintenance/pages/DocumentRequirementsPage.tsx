import { useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { Button } from '@/shared/components';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import {
  useDocumentRequirements,
  useSetScopeRequirements,
  type SetScopeRequirementsPayload,
} from '../api/documentRequirements';
import {
  useCreateDocumentType,
  useDeleteDocumentType,
  useDocumentTypesAdmin,
  useReorderDocumentTypes,
  useUpdateDocumentType,
} from '../api/documentTypesAdmin';
import DocumentRequirementTable from '../components/DocumentRequirementTable';
import DocumentRequirementModal from '../components/DocumentRequirementModal';
import DocumentTypeTable from '../components/DocumentTypeTable';
import DocumentTypeModal, { type DocumentTypeFormValues } from '../components/DocumentTypeModal';
import type { DocumentTypeDto } from '../types';

type Tab = 'requirements' | 'types';

const DocumentRequirementsPage = () => {
  const [tab, setTab] = useState<Tab>('types');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Requirements state
  const { data: requirements = [], isLoading: reqLoading } = useDocumentRequirements(includeInactive);
  const setScope = useSetScopeRequirements();
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqScope, setReqScope] = useState<{
    propertyTypeCode: string | null;
    purposeCode: string | null;
  } | null>(null);
  const [deletingScope, setDeletingScope] = useState<{
    propertyTypeCode: string | null;
    purposeCode: string | null;
    total: number;
  } | null>(null);

  // Document type state
  const { data: docTypes = [], isLoading: typeLoading } = useDocumentTypesAdmin(includeInactive);
  const createType = useCreateDocumentType();
  const updateType = useUpdateDocumentType();
  const deleteType = useDeleteDocumentType();
  const reorderTypes = useReorderDocumentTypes();
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentTypeDto | null>(null);
  const [deletingType, setDeletingType] = useState<DocumentTypeDto | null>(null);

  const handleSaveScope = async (payload: SetScopeRequirementsPayload) => {
    setIsSaving(true);
    try {
      await setScope.mutateAsync(payload);
      toast.success('Requirements saved');
      setReqModalOpen(false);
      setReqScope(null);
    } catch (e: any) {
      toast.error(e?.apiError?.detail || 'Failed to save requirements.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveType = async (values: DocumentTypeFormValues) => {
    setIsSaving(true);
    try {
      if (editingType) {
        await updateType.mutateAsync({
          id: editingType.id,
          name: values.name,
          description: values.description,
          category: values.category,
          sortOrder: values.sortOrder,
          isActive: values.isActive,
        });
      } else {
        await createType.mutateAsync({
          code: values.code,
          name: values.name,
          description: values.description,
          category: values.category,
          sortOrder: values.sortOrder,
        });
      }
      toast.success('Document type saved');
      setTypeModalOpen(false);
      setEditingType(null);
    } catch (e: any) {
      toast.error(e?.apiError?.detail || 'Failed to save document type.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteScope = async () => {
    if (!deletingScope) return;
    try {
      await setScope.mutateAsync({
        propertyTypeCode: deletingScope.propertyTypeCode,
        purposeCode: deletingScope.purposeCode,
        items: [],
      });
      toast.success('Requirements removed');
    } catch (e: any) {
      toast.error(e?.apiError?.detail || 'Failed to delete.');
    } finally {
      setDeletingScope(null);
    }
  };

  const confirmDeleteType = async () => {
    if (!deletingType) return;
    try {
      await deleteType.mutateAsync(deletingType.id);
      toast.success('Document type deleted');
    } catch (e: any) {
      toast.error(e?.apiError?.detail || 'Failed to delete.');
    } finally {
      setDeletingType(null);
    }
  };

  const tabBtn = (key: Tab, label: string) => (
    <button
      onClick={() => setTab(key)}
      className={clsx(
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
        tab === key
          ? 'border-gray-800 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Document Requirements</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure required documents by collateral type and purpose
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (tab === 'requirements') {
              setReqScope(null);
              setReqModalOpen(true);
            } else {
              setEditingType(null);
              setTypeModalOpen(true);
            }
          }}
          leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
        >
          {tab === 'requirements' ? 'Add Requirement' : 'Add Document Type'}
        </Button>
      </div>

      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2">
          {tabBtn('types', 'Document Types')}
          {tabBtn('requirements', 'Requirements')}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {tab === 'requirements' ? (
          <DocumentRequirementTable
            requirements={requirements}
            isLoading={reqLoading}
            onEdit={r => {
              setReqScope({
                propertyTypeCode: r.propertyTypeCode ?? null,
                purposeCode: r.purposeCode ?? null,
              });
              setReqModalOpen(true);
            }}
            onDelete={setDeletingScope}
          />
        ) : (
          <DocumentTypeTable
            documentTypes={docTypes}
            isLoading={typeLoading}
            onEdit={dt => {
              setEditingType(dt);
              setTypeModalOpen(true);
            }}
            onDelete={setDeletingType}
            onReorder={async items => {
              try {
                await reorderTypes.mutateAsync(items);
                toast.success('Order updated');
              } catch (e: any) {
                toast.error(e?.apiError?.detail || 'Failed to reorder.');
              }
            }}
          />
        )}
      </div>

      <DocumentRequirementModal
        isOpen={reqModalOpen}
        onClose={() => {
          setReqModalOpen(false);
          setReqScope(null);
        }}
        onSubmit={handleSaveScope}
        requirements={requirements}
        initialScope={reqScope}
        isSaving={isSaving}
      />

      <DocumentTypeModal
        isOpen={typeModalOpen}
        onClose={() => {
          setTypeModalOpen(false);
          setEditingType(null);
        }}
        onSubmit={handleSaveType}
        editing={editingType}
        isSaving={isSaving}
      />

      <ConfirmDialog
        isOpen={!!deletingScope}
        onClose={() => setDeletingScope(null)}
        onConfirm={confirmDeleteScope}
        title="Remove requirements"
        message={`This will remove all ${deletingScope?.total ?? ''} document requirement(s) for this scope. Continue?`}
      />

      <ConfirmDialog
        isOpen={!!deletingType}
        onClose={() => setDeletingType(null)}
        onConfirm={confirmDeleteType}
        title="Delete document type"
        message="This will delete the document type. Continue?"
      />
    </div>
  );
};

export default DocumentRequirementsPage;
