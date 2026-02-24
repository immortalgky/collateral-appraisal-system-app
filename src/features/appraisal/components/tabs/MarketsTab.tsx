import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import Badge from '@shared/components/Badge';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useAppraisalContext } from '../../context/AppraisalContext';
import {
  useGetAppraisalComparables,
  useUnlinkAppraisalComparable,
} from '../../api/marketComparable';
import FormCard from '@shared/components/sections/FormCard';
import { PROPERTY_TYPES, PropertyTypeDropdown } from '../PropertyTypeDropdown';

import type { AppraisalComparableDtoType } from '@/shared/schemas/v1';

/** Look up icon name for a property type code */
const getPropertyIcon = (code: string | null | undefined): string | null => {
  if (!code) return null;
  const match = PROPERTY_TYPES.find(pt => pt.code === code);
  return match?.icon ?? null;
};

export const MarketsTab = () => {
  const navigate = useNavigate();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;

  const {
    data: appraisalComparables,
    isLoading,
    isError,
  } = useGetAppraisalComparables(appraisalId);
  const { mutate: unlinkComparable } = useUnlinkAppraisalComparable();

  // Unlink confirmation state
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  const handleCreateSelect = (_type: string, _groupId: string, code: string) => {
    navigate(
      `/appraisal/${appraisalId}/property/market-comparable/new?propertyType=${encodeURIComponent(code)}`,
    );
  };

  const handleViewComparable = (marketComparableId: string) => {
    navigate(`/appraisal/${appraisalId}/property/market-comparable/${marketComparableId}`);
  };

  const handleUnlink = (comparableId: string) => {
    setUnlinkConfirm({ isOpen: true, id: comparableId });
  };

  const confirmUnlink = () => {
    if (!appraisalId || !unlinkConfirm.id) return;
    unlinkComparable(
      { appraisalId, comparableId: unlinkConfirm.id },
      {
        onSuccess: () => {
          toast.success('Comparable unlinked successfully');
          setUnlinkConfirm({ isOpen: false, id: null });
        },
        onError: () => {
          toast.error('Failed to unlink comparable');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-50 border-b border-gray-100" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 border-b border-gray-100 px-4 flex items-center gap-4">
                <div className="h-4 w-24 bg-gray-100 rounded" />
                <div className="h-4 w-32 bg-gray-100 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Icon name="triangle-exclamation" className="text-4xl mb-3 text-red-400" />
        <p className="text-sm font-medium">Failed to load market comparables</p>
        <p className="text-xs text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  const comparables: AppraisalComparableDtoType[] = appraisalComparables ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Market Comparables</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {comparables.length} comparable{comparables.length !== 1 ? 's' : ''} linked to this
            appraisal
          </p>
        </div>
        <PropertyTypeDropdown
          groupId=""
          onSelectType={handleCreateSelect}
          buttonLabel="Create Comparable"
          disableDefaultNavigation
          align="right"
        />
      </div>

      {/* Comparable List */}
      {comparables.length === 0 ? (
        <FormCard title="Market Comparables" subtitle="Comparative market analysis">
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Icon name="chart-line" className="text-2xl text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No market comparables yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Create a market comparable to analyze comparable properties
            </p>
            <PropertyTypeDropdown
              groupId=""
              onSelectType={handleCreateSelect}
              buttonLabel="Create First Comparable"
              disableDefaultNavigation
            />
          </div>
        </FormCard>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-primary/5 border-b border-gray-100 text-xs font-medium text-primary uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Comparable No.</div>
            <div className="col-span-3">Survey Name</div>
            <div className="col-span-2">Property Type</div>
            <div className="col-span-2">Info Date</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {comparables.map((comparable, index) => {
              const propIcon = getPropertyIcon(comparable.comparablePropertyType);
              return (
                <div
                  key={comparable.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-l-2 border-l-transparent hover:border-l-primary hover:bg-gray-50 transition-all cursor-pointer group"
                  onClick={() => handleViewComparable(comparable.marketComparableId)}
                >
                  <div className="col-span-1 flex items-center">
                    <span className="text-xs text-gray-400 font-medium">{index + 1}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm font-semibold text-primary">
                      {comparable.comparableNumber || '-'}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-gray-600 truncate">
                      {comparable.comparableSurveyName || '-'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Badge type="property" value={comparable.comparablePropertyType} size="xs" dot={false}>
                      {propIcon && (
                        <Icon name={propIcon} style="solid" className="text-[10px]" />
                      )}
                      {comparable.comparablePropertyType || '-'}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-600">
                      {comparable.comparableInfoDateTime
                        ? new Date(comparable.comparableInfoDateTime).toLocaleDateString('th-TH')
                        : '-'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleViewComparable(comparable.marketComparableId);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-sm text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                      title="Edit comparable"
                    >
                      <Icon name="pencil" style="solid" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleUnlink(comparable.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-sm text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                      title="Unlink comparable"
                    >
                      <Icon name="trash-can" style="solid" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unlink Confirmation Dialog */}
      <ConfirmDialog
        isOpen={unlinkConfirm.isOpen}
        onClose={() => setUnlinkConfirm({ isOpen: false, id: null })}
        onConfirm={confirmUnlink}
        title="Unlink Comparable"
        message="Are you sure you want to unlink this comparable from the appraisal?"
        confirmText="Unlink"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default MarketsTab;
