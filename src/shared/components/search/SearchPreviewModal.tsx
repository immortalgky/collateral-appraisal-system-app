import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Icon from '@shared/components/Icon';
import type { SearchResultItem } from '@shared/types/search';
import clsx from 'clsx';

const categoryConfig = {
  requests: { icon: 'folder-open', color: 'text-blue-600', bg: 'bg-blue-50', label: 'search.filters.requests' },
  customers: { icon: 'users', color: 'text-purple-600', bg: 'bg-purple-50', label: 'search.filters.customers' },
  properties: { icon: 'building', color: 'text-amber-600', bg: 'bg-amber-50', label: 'search.filters.properties' },
};

const metadataLabels: Record<string, Record<string, string>> = {
  requests: {
    requestNumber: 'Request No.',
    status: 'Status',
    customerName: 'Customer',
    collateralType: 'Collateral Type',
    appraisalPurpose: 'Purpose',
    createdDate: 'Created',
    assignedStaff: 'Assigned To',
  },
  customers: {
    customerName: 'Name',
    customerId: 'Customer ID',
    companyName: 'Company',
    phone: 'Phone',
    email: 'Email',
    linkedRequestCount: 'Linked Requests',
  },
  properties: {
    propertyType: 'Type',
    address: 'Address',
    titleDeedNumber: 'Title Deed No.',
    area: 'Area',
    linkedAppraisalId: 'Appraisal ID',
  },
};

interface Props {
  item: SearchResultItem | null;
  onClose: () => void;
}

export default function SearchPreviewModal({ item, onClose }: Props) {
  const { t } = useTranslation('nav');
  const navigate = useNavigate();

  if (!item) return null;

  const config = categoryConfig[item.category];
  const labels = metadataLabels[item.category] ?? {};

  const handleOpenFullPage = () => {
    navigate(item.navigateTo);
    onClose();
  };

  return (
    <Modal isOpen={!!item} onClose={onClose} title={item.title} size="md">
      <div className="space-y-4">
        {/* Category Badge */}
        <div className="flex items-center gap-2">
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
            <Icon name={config.icon} style="solid" className={clsx('size-4', config.color)} />
          </div>
          <span className="text-sm font-medium text-gray-500">{t(config.label as never)}</span>
          {item.status && (
            <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {item.status}
            </span>
          )}
        </div>

        {/* Subtitle */}
        <p className="text-sm text-gray-600">{item.subtitle}</p>

        {/* Metadata */}
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {Object.entries(item.metadata).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {labels[key] ?? key}
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Action */}
        <div className="border-t border-gray-100 pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleOpenFullPage}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Icon name="arrow-up-right-from-square" style="solid" className="size-3.5" />
            {t('search.openFullPage', 'Open full page')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
