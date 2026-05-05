import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import Pagination from '@shared/components/Pagination';
import { formatLocaleDate, formatLocaleDateTime } from '@shared/utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/store';
import toast from 'react-hot-toast';
import {
  useCollateralMaster,
  useCollateralEngagements,
  useEngagementSnapshot,
  useEditCollateralMaster,
  useSoftDeleteCollateralMaster,
  useRestoreCollateralMaster,
} from '../api/hooks';
import type { CollateralMasterDto } from '../api/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500 w-44 shrink-0">{label}</span>
      <span className="text-xs text-gray-800 break-all">{value ?? '—'}</span>
    </div>
  );
}

// ─── Type-aware detail panel ──────────────────────────────────────────────────

function MasterDetailPanel({ master }: { master: CollateralMasterDto }) {
  const { i18n } = useTranslation();

  if (master.collateralType === 'Land' && master.landDetail) {
    const d = master.landDetail;
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Land Identity</p>
        <DetailRow label="Land Office Code" value={d.landOfficeCode} />
        <DetailRow label="Province" value={d.province} />
        <DetailRow label="Amphur" value={d.amphur} />
        <DetailRow label="Tambon" value={d.tambon} />
        <DetailRow label="Title Deed Type" value={d.titleDeedType} />
        <DetailRow label="Title Deed No" value={d.titleDeedNo} />
        <DetailRow label="Survey / Parcel No" value={d.surveyOrParcelNo} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last-known</p>
        <DetailRow label="Land Area (m²)" value={d.landArea} />
        <DetailRow label="Road Frontage (m)" value={d.roadFrontage} />
        <DetailRow label="Land Shape" value={d.landShapeType} />
        <DetailRow label="Zone" value={d.landZoneType} />
        <DetailRow label="Urban Planning" value={d.urbanPlanningType} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Construction</p>
        <DetailRow
          label="Under Construction"
          value={d.isUnderConstructionAtLastAppraisal ? 'Yes (at last appraisal)' : 'No'}
        />
        <DetailRow
          label="Overall Progress"
          value={
            d.overallConstructionProgressPercent != null
              ? `${d.overallConstructionProgressPercent.toFixed(1)}%`
              : null
          }
        />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last Appraisal</p>
        <DetailRow label="Appraisal No" value={d.lastAppraisalNumber} />
        <DetailRow label="Date" value={formatLocaleDate(d.lastAppraisedDate, i18n.language)} />
        <DetailRow
          label="Value (Land only)"
          value={d.lastAppraisedValue != null ? `฿${d.lastAppraisedValue.toLocaleString('th-TH')}` : null}
        />
        <DetailRow
          label="Value (Land + Buildings)"
          value={
            d.lastTotalAppraisedValue != null
              ? `฿${d.lastTotalAppraisedValue.toLocaleString('th-TH')}`
              : null
          }
        />
      </div>
    );
  }

  if (master.collateralType === 'Condo' && master.condoDetail) {
    const d = master.condoDetail;
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Condo Identity</p>
        <DetailRow label="Land Office Code" value={d.landOfficeCode} />
        <DetailRow label="Condo Registration No" value={d.condoRegistrationNumber} />
        <DetailRow label="Building" value={d.buildingNumber} />
        <DetailRow label="Floor" value={d.floorNumber} />
        <DetailRow label="Unit" value={d.unitNumber} />
        <DetailRow label="Title Number" value={d.titleNumber} />
        <DetailRow label="Title Type" value={d.titleType} />
        <DetailRow label="Condo Name" value={d.condoName} />
        <DetailRow label="Province" value={d.province} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last-known</p>
        <DetailRow label="Usable Area (m²)" value={d.usableArea} />
        <DetailRow label="Location Type" value={d.locationType} />
        <DetailRow label="Building Age" value={d.buildingAge} />
        <DetailRow label="Construction Year" value={d.constructionYear} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last Appraisal</p>
        <DetailRow label="Appraisal No" value={d.lastAppraisalNumber} />
        <DetailRow label="Date" value={formatLocaleDate(d.lastAppraisedDate, i18n.language)} />
        <DetailRow
          label="Value"
          value={d.lastAppraisedValue != null ? `฿${d.lastAppraisedValue.toLocaleString('th-TH')}` : null}
        />
      </div>
    );
  }

  if (master.collateralType === 'Leasehold' && master.leaseholdDetail) {
    const d = master.leaseholdDetail;
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Leasehold Identity</p>
        <DetailRow label="Lease Registration No" value={d.leaseRegistrationNo} />
        <DetailRow label="Underlying Master ID" value={d.underlyingMasterId} />
        <DetailRow label="Lessor" value={d.lessor} />
        <DetailRow label="Lessee" value={d.lessee} />
        <DetailRow label="Lease Term Start" value={formatLocaleDate(d.leaseTermStart, i18n.language)} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last-known</p>
        <DetailRow label="Lease Term End" value={formatLocaleDate(d.leaseTermEnd, i18n.language)} />
        <DetailRow label="Lease Term (months)" value={d.leaseTermMonths} />
        <DetailRow
          label="Annual Rent"
          value={d.annualRent != null ? `฿${d.annualRent.toLocaleString('th-TH')}` : null}
        />
        <DetailRow label="Lease Purpose" value={d.leasePurpose} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last Appraisal</p>
        <DetailRow label="Appraisal No" value={d.lastAppraisalNumber} />
        <DetailRow label="Date" value={formatLocaleDate(d.lastAppraisedDate, i18n.language)} />
        <DetailRow
          label="Value"
          value={d.lastAppraisedValue != null ? `฿${d.lastAppraisedValue.toLocaleString('th-TH')}` : null}
        />
      </div>
    );
  }

  if (master.collateralType === 'Machine' && master.machineDetail) {
    const d = master.machineDetail;
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Machine Identity</p>
        <DetailRow label="Registration No" value={d.machineRegistrationNo} />
        <DetailRow label="Serial No" value={d.serialNo} />
        <DetailRow label="Brand" value={d.brand} />
        <DetailRow label="Model" value={d.model} />
        <DetailRow label="Manufacturer" value={d.manufacturer} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last-known</p>
        <DetailRow label="Engine No" value={d.engineNo} />
        <DetailRow label="Chassis No" value={d.chassisNo} />
        <DetailRow label="Year of Manufacture" value={d.yearOfManufacture} />
        <DetailRow label="Condition" value={d.machineCondition} />
        <DetailRow label="Age (years)" value={d.machineAge} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Last Appraisal</p>
        <DetailRow label="Appraisal No" value={d.lastAppraisalNumber} />
        <DetailRow label="Date" value={formatLocaleDate(d.lastAppraisedDate, i18n.language)} />
        <DetailRow
          label="Value"
          value={d.lastAppraisedValue != null ? `฿${d.lastAppraisedValue.toLocaleString('th-TH')}` : null}
        />
      </div>
    );
  }

  return <p className="text-sm text-gray-400">No detail available.</p>;
}

// ─── Snapshot modal ───────────────────────────────────────────────────────────

function SnapshotModal({
  masterId,
  engagementId,
  onClose,
}: {
  masterId: string;
  engagementId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useEngagementSnapshot(masterId, engagementId);

  return (
    <dialog className="modal modal-open z-[60]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Engagement Snapshot</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Icon name="xmark" style="solid" className="size-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Icon name="spinner" style="solid" className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(data?.snapshot, null, 2)}
            </pre>
          )}
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
}

// ─── Reason dialog ────────────────────────────────────────────────────────────

function ReasonDialog({
  isOpen,
  title,
  onClose,
  onConfirm,
  isLoading,
  variant = 'primary',
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  variant?: 'danger' | 'primary' | 'warning';
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const btnClass = {
    danger: 'bg-danger hover:bg-danger/80 text-white',
    primary: 'bg-primary hover:bg-primary/80 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  }[variant];

  return (
    <dialog className="modal modal-open z-[60]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Reason <span className="text-danger">*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Required — explain the reason for this action..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim()}
            className={clsx(
              'flex-1 px-4 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50',
              btnClass,
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                Processing...
              </span>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CollateralMasterDetailPage() {
  const { masterId } = useParams<{ masterId: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const user = useAuthStore(s => s.user);

  const isAdmin = user?.permissions?.includes('COLLATERAL_ADMIN') ?? false;

  const { data: master, isLoading, isError } = useCollateralMaster(masterId);

  // Engagement history
  const [engPage, setEngPage] = useState(0);
  const { data: engData } = useCollateralEngagements(masterId, engPage, 10);
  const engItems = engData?.items ?? [];
  const engTotal = engData?.count ?? 0;
  const engTotalPages = Math.ceil(engTotal / 10);

  // Snapshot modal
  const [snapshotEngagementId, setSnapshotEngagementId] = useState<string | null>(null);

  // Admin dialogs
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);

  const { mutate: doEdit, isPending: isEditing } = useEditCollateralMaster();
  const { mutate: doDelete, isPending: isDeleting } = useSoftDeleteCollateralMaster();
  const { mutate: doRestore, isPending: isRestoring } = useRestoreCollateralMaster();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Icon name="spinner" style="solid" className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !master) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Collateral master not found</p>
        <Button onClick={() => navigate('/admin/collateral-masters')}>Back to Catalog</Button>
      </div>
    );
  }

  const handleEdit = (reason: string) => {
    if (!masterId) return;
    doEdit(
      { id: masterId, body: { reason, ownerName: master.ownerName } },
      {
        onSuccess: () => {
          toast.success('Master updated');
          setEditDialog(false);
        },
        onError: (e: any) => {
          toast.error(e.apiError?.detail ?? 'Failed to edit');
          setEditDialog(false);
        },
      },
    );
  };

  const handleDelete = (reason: string) => {
    if (!masterId) return;
    doDelete(
      { id: masterId, reason },
      {
        onSuccess: () => {
          toast.success('Master soft-deleted');
          setDeleteDialog(false);
        },
        onError: (e: any) => {
          toast.error(e.apiError?.detail ?? 'Failed to delete');
          setDeleteDialog(false);
        },
      },
    );
  };

  const handleRestore = (reason: string) => {
    if (!masterId) return;
    doRestore(
      { id: masterId, body: { reason } },
      {
        onSuccess: () => {
          toast.success('Master restored');
          setRestoreDialog(false);
        },
        onError: (e: any) => {
          toast.error(e.apiError?.detail ?? 'Failed to restore');
          setRestoreDialog(false);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/collateral-masters')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Icon name="arrow-left" style="solid" className="size-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {master.collateralType} Master
              {master.isDeleted && (
                <span className="ml-2 text-xs font-normal text-red-500">(deleted)</span>
              )}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{master.id}</p>
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex gap-2">
            {master.isDeleted ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRestoreDialog(true)}
                isLoading={isRestoring}
              >
                <Icon name="rotate-right" style="solid" className="size-3.5 mr-1.5" />
                Restore
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditDialog(true)}>
                  <Icon name="pen" style="solid" className="size-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteDialog(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Icon name="trash" style="solid" className="size-3.5 mr-1.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Detail panel */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <MasterDetailPanel master={master} />
        </div>

        {/* Meta panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Master Record
          </p>
          <DetailRow label="Type" value={master.collateralType} />
          <DetailRow label="Owner / Lessee" value={master.ownerName} />
          <DetailRow label="Created" value={formatLocaleDateTime(master.createdOn, i18n.language)} />
          <DetailRow label="Created by" value={master.createdBy} />
          <DetailRow
            label="Updated"
            value={master.updatedOn ? formatLocaleDateTime(master.updatedOn, i18n.language) : null}
          />
          <DetailRow label="Updated by" value={master.updatedBy} />
        </div>
      </div>

      {/* Engagement history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Engagement History{' '}
            <span className="text-xs font-normal text-gray-400">({engTotal} total)</span>
          </h3>
        </div>

        {engItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Icon style="regular" name="folder-open" className="size-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No engagements yet</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left font-medium text-gray-600 px-4 py-2.5">Appraisal #</th>
                  <th className="text-left font-medium text-gray-600 px-4 py-2.5">Type</th>
                  <th className="text-left font-medium text-gray-600 px-4 py-2.5">Company</th>
                  <th className="text-left font-medium text-gray-600 px-4 py-2.5">Date</th>
                  <th className="text-right font-medium text-gray-600 px-4 py-2.5">Value</th>
                  <th className="w-16 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {engItems.map(eng => (
                  <tr key={eng.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-primary text-xs">
                      {eng.appraisalNumber}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{eng.appraisalType}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[160px] truncate">
                      {eng.appraisalCompanyName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                      {formatLocaleDate(eng.appraisalDate, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs text-gray-700">
                      {eng.appraisedValue != null
                        ? `฿${eng.appraisedValue.toLocaleString('th-TH')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSnapshotEngagementId(eng.id)}
                        className="px-2 py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors"
                        title="View snapshot"
                      >
                        Snapshot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {engTotalPages > 1 && (
              <Pagination
                currentPage={engPage}
                totalPages={engTotalPages}
                totalCount={engTotal}
                pageSize={10}
                onPageChange={setEngPage}
                showPageSizeSelector={false}
              />
            )}
          </>
        )}
      </div>

      {/* Snapshot modal */}
      {snapshotEngagementId && masterId && (
        <SnapshotModal
          masterId={masterId}
          engagementId={snapshotEngagementId}
          onClose={() => setSnapshotEngagementId(null)}
        />
      )}

      {/* Admin dialogs */}
      <ReasonDialog
        isOpen={editDialog}
        title="Edit Collateral Master"
        onClose={() => setEditDialog(false)}
        onConfirm={handleEdit}
        isLoading={isEditing}
        variant="primary"
      />
      <ReasonDialog
        isOpen={deleteDialog}
        title="Soft-Delete Collateral Master"
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        variant="danger"
      />
      <ReasonDialog
        isOpen={restoreDialog}
        title="Restore Collateral Master"
        onClose={() => setRestoreDialog(false)}
        onConfirm={handleRestore}
        isLoading={isRestoring}
        variant="primary"
      />
    </div>
  );
}
