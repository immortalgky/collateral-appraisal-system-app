import { useMemo, useState } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useAppraisalSearch } from '@/features/appraisal/api/appraisalSearch';
import type { AppraisalDto } from '@/features/appraisal/api/appraisalSearch';
import {
  fetchAppraisalCopyTemplate,
  type AppraisalCopyTemplate,
} from '@/features/appraisal/api/copyTemplate';
import AppraisalResultsTable from '@/features/appraisal/components/search/AppraisalResultsTable';
import SearchFilterBar from '@/features/appraisal/components/search/SearchFilterBar';
import type { AppraisalColumnDef, FilterField } from '@/features/appraisal/components/search/tabConfigs';
import { useAddressStore } from '@/shared/store';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';

interface SearchAppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: AppraisalCopyTemplate) => void;
}

const dateFilterFields: FilterField[] = [
  { key: 'appointmentDateFrom', label: 'Appraisal date from', type: 'date' },
  { key: 'appointmentDateTo', label: 'Appraisal date to', type: 'date' },
];

const SearchAppraisalModal = ({ isOpen, onClose, onSelect }: SearchAppraisalModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFetchingTemplate, setIsFetchingTemplate] = useState(false);
  const [sortBy, setSortBy] = useState('appointmentDateTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [dateFilters, setDateFilters] = useState<Record<string, string>>({});

  const debouncedSearch = useDebounce(searchQuery, 350);

  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);

  const { provinceCodeToName, districtCodeToName } = useMemo(() => {
    const provinceMap = new Map<string, string>();
    const districtMap = new Map<string, string>();
    for (const addr of [...titleAddresses, ...dopaAddresses]) {
      if (!provinceMap.has(addr.provinceCode)) {
        provinceMap.set(addr.provinceCode, addr.provinceName);
      }
      if (!districtMap.has(addr.districtCode)) {
        districtMap.set(addr.districtCode, addr.districtName);
      }
    }
    return { provinceCodeToName: provinceMap, districtCodeToName: districtMap };
  }, [titleAddresses, dopaAddresses]);

  const { data, isLoading } = useAppraisalSearch(
    {
      search: debouncedSearch || undefined,
      status: 'Completed',
      appointmentDateFrom: dateFilters.appointmentDateFrom || undefined,
      appointmentDateTo: dateFilters.appointmentDateTo || undefined,
      sortBy,
      sortDir,
      pageNumber: 0,
      pageSize: 50,
    },
    { enabled: isOpen },
  );

  const appraisals = data?.result?.items ?? [];

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns = useMemo<AppraisalColumnDef[]>(
    () => [
      { key: 'appraisalNumber', label: 'Appraisal No.', sortable: true },
      { key: 'customerName', label: 'Customer', sortable: true },
      {
        key: 'location',
        label: 'Location',
        sortable: false,
        render: (item: AppraisalDto) => {
          const districtName = item.district
            ? districtCodeToName.get(item.district) ?? item.district
            : null;
          const provinceName = item.province
            ? provinceCodeToName.get(item.province) ?? item.province
            : null;
          return [districtName, provinceName].filter(Boolean).join(', ') || '-';
        },
      },
      {
        key: 'facilityLimit',
        label: 'Facility Limit',
        sortable: false,
        render: (item: AppraisalDto) => formatCurrency(item.facilityLimit),
      },
      {
        key: 'appraisalValue',
        label: 'Appraisal Value',
        sortable: false,
        render: (item: AppraisalDto) => formatCurrency(item.appraisalValue),
      },
      {
        key: 'appointmentDateTime',
        label: 'Appraisal Date',
        sortable: true,
        render: (item: AppraisalDto) => formatDate(item.appointmentDateTime),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provinceCodeToName, districtCodeToName],
  );

  const handleSort = (field: string) => {
    if (field === sortBy) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const handleRowClick = async (appraisalId: string) => {
    setSelectedId(appraisalId);
    setIsFetchingTemplate(true);
    try {
      const template = await fetchAppraisalCopyTemplate(appraisalId);
      onSelect(template);
      handleClose();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error('This appraisal is not completed and cannot be copied.');
      } else if (isAxiosError(err) && err.response?.status === 404) {
        toast.error('Appraisal not found.');
      } else {
        toast.error('Failed to load appraisal data. Please try again.');
      }
      setSelectedId(null);
    } finally {
      setIsFetchingTemplate(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedId(null);
    setIsFetchingTemplate(false);
    setSortBy('appointmentDateTime');
    setSortDir('desc');
    setDateFilters({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Search Previous Appraisal Report" size="xl">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by appraisal number or customer name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            autoFocus
          />
        </div>

        <SearchFilterBar
          filters={dateFilterFields}
          values={dateFilters}
          onChange={(key, value) => setDateFilters(prev => ({ ...prev, [key]: value }))}
          onClear={() => setDateFilters({})}
        />

        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-80">
          <AppraisalResultsTable
            columns={columns}
            items={appraisals}
            isLoading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={item => handleRowClick(item.id)}
            loadingRowId={isFetchingTemplate ? (selectedId ?? undefined) : undefined}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Click a row to copy its data into the new request.
          </p>
          <Button variant="outline" onClick={handleClose} disabled={isFetchingTemplate}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchAppraisalModal;
