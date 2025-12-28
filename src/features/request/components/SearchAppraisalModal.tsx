import { useState, useMemo } from 'react';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';

export interface AppraisalReport {
  id: string;
  reportNo: string;
  appraisalValue: number;
  appraisalDate: string;
  propertyType: string;
  address: string;
}

interface SearchAppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (report: AppraisalReport) => void;
}

// Mock data for development
const mockAppraisalReports: AppraisalReport[] = [
  {
    id: '1',
    reportNo: 'APR-2024-001234',
    appraisalValue: 5500000,
    appraisalDate: '2024-06-15',
    propertyType: 'Land',
    address: '123 Sukhumvit Rd, Bangkok',
  },
  {
    id: '2',
    reportNo: 'APR-2024-001235',
    appraisalValue: 8200000,
    appraisalDate: '2024-07-20',
    propertyType: 'Condo',
    address: '456 Silom Rd, Bangkok',
  },
  {
    id: '3',
    reportNo: 'APR-2024-001236',
    appraisalValue: 12500000,
    appraisalDate: '2024-08-10',
    propertyType: 'Building',
    address: '789 Ratchada Rd, Bangkok',
  },
  {
    id: '4',
    reportNo: 'APR-2023-000890',
    appraisalValue: 3200000,
    appraisalDate: '2023-11-25',
    propertyType: 'Land',
    address: '321 Petchburi Rd, Bangkok',
  },
  {
    id: '5',
    reportNo: 'APR-2023-000891',
    appraisalValue: 7800000,
    appraisalDate: '2023-12-05',
    propertyType: 'Condo',
    address: '654 Sathorn Rd, Bangkok',
  },
];

const SearchAppraisalModal = ({ isOpen, onClose, onSelect }: SearchAppraisalModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<AppraisalReport | null>(null);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return mockAppraisalReports;
    const query = searchQuery.toLowerCase();
    return mockAppraisalReports.filter(
      report =>
        report.reportNo.toLowerCase().includes(query) ||
        report.address.toLowerCase().includes(query) ||
        report.propertyType.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const handleSelect = () => {
    if (selectedReport) {
      onSelect(selectedReport);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedReport(null);
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Search Previous Appraisal Report" size="xl">
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <div className="relative">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by report number, address, or property type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            autoFocus
          />
        </div>

        {/* Results Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Report No.</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Property Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Address</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Appraisal Value</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No reports found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map(report => (
                    <tr
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`cursor-pointer transition-colors ${
                        selectedReport?.id === report.id
                          ? 'bg-primary-50 hover:bg-primary-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{report.reportNo}</td>
                      <td className="px-4 py-3 text-gray-600">{report.propertyType}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-48 truncate" title={report.address}>
                        {report.address}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {formatCurrency(report.appraisalValue)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(report.appraisalDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedReport}>
            <Icon name="check" style="solid" className="w-4 h-4 mr-2" />
            Select
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchAppraisalModal;
