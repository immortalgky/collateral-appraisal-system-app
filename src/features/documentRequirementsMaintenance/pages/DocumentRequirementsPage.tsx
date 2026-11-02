import { useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('request');
  const [tab, setTab] = useState<Tab>('types');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Requirements state
  const { data: requirements = [], isLoading: reqLoading } =
    useDocumentRequirements(includeInactive);
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
      toast.success(t('documentRequirementsPage.toasts.requirementsSaved'));
      setReqModalOpen(false);
      setReqScope(null);
    } catch (e: any) {
      toast.error(
        e?.apiError?.detail || t('documentRequirementsPage.toasts.saveRequirementsFailed'),
      );
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
          nameTh: values.nameTh ?? null,
          description: values.description,
          category: values.category,
          sortOrder: values.sortOrder,
          isActive: values.isActive,
          carryForwardByDefault: values.carryForwardByDefault,
        });
      } else {
        await createType.mutateAsync({
          code: values.code,
          name: values.name,
          nameTh: values.nameTh ?? null,
          description: values.description,
          category: values.category,
          sortOrder: values.sortOrder,
          carryForwardByDefault: values.carryForwardByDefault,
        });
      }
      toast.success(t('documentRequirementsPage.toasts.typeSaved'));
      setTypeModalOpen(false);
      setEditingType(null);
    } catch (e: any) {
      toast.error(e?.apiError?.detail || t('documentRequirementsPage.toasts.saveTypeFailed'));
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
      toast.success(t('documentRequirementsPage.toasts.requirementsRemoved'));
    } catch (e: any) {
      toast.error(e?.apiError?.detail || t('documentRequirementsPage.toasts.deleteFailed'));
    } finally {
      setDeletingScope(null);
    }
  };

  const confirmDeleteType = async () => {
    if (!deletingType) return;
    try {
      await deleteType.mutateAsync(deletingType.id);
      toast.success(t('documentRequirementsPage.toasts.typeDeleted'));
    } catch (e: any) {
      toast.error(e?.apiError?.detail || t('documentRequirementsPage.toasts.deleteFailed'));
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
          ? 'border-gray-800 text-(--palette-ink)'
          : 'border-transparent text-(--palette-gray-500) hover:text-(--palette-ink)',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-(--palette-ink)">
            {t('documentRequirementsPage.title')}
          </h3>
          <p className="text-xs text-(--palette-gray-500) mt-0.5">
            {t('documentRequirementsPage.subtitle')}
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
          {tab === 'requirements'
            ? t('documentRequirementsPage.addRequirement')
            : t('documentRequirementsPage.addDocumentType')}
        </Button>
      </div>

      <div className="flex items-center justify-between border-b border-(--palette-line)">
        <div className="flex gap-2">
          {tabBtn('types', t('documentRequirementsPage.tabs.types'))}
          {tabBtn('requirements', t('documentRequirementsPage.tabs.requirements'))}
        </div>

        <label className="flex items-center gap-2 text-sm text-(--palette-gray-600)">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
          />
          {t('documentRequirementsPage.showInactive')}
        </label>
      </div>

      <div className="bg-(--palette-surface) rounded-xl border border-(--palette-line) shadow-sm overflow-hidden">
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
                toast.success(t('documentRequirementsPage.toasts.orderUpdated'));
              } catch (e: any) {
                toast.error(
                  e?.apiError?.detail || t('documentRequirementsPage.toasts.reorderFailed'),
                );
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
        title={t('documentRequirementsPage.confirm.removeScopeTitle')}
        message={t('documentRequirementsPage.confirm.removeScopeMessage', {
          count: deletingScope?.total ?? 0,
        })}
      />

      <ConfirmDialog
        isOpen={!!deletingType}
        onClose={() => setDeletingType(null)}
        onConfirm={confirmDeleteType}
        title={t('documentRequirementsPage.confirm.deleteTypeTitle')}
        message={t('documentRequirementsPage.confirm.deleteTypeMessage')}
      />
    </div>
  );
};

export default DocumentRequirementsPage;
