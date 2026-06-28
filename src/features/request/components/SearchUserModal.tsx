import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Avatar from '@/shared/components/Avatar';
import type { RequestorDtoType } from '../schemas/form';
import { useSearchRequestors, type RequestorInfoDto } from '../api/requestors';

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: RequestorDtoType) => void;
}

const SearchUserModal = ({ isOpen, onClose, onSelect }: SearchUserModalProps) => {
  const { t } = useTranslation(['request', 'common']);
  const [searchQuery, setSearchQuery] = useState('');
  // Internal state keeps the full API result (employeeId used as selection key)
  const [selectedUser, setSelectedUser] = useState<RequestorInfoDto | null>(null);

  const { data: results, isLoading } = useSearchRequestors(searchQuery);

  const handleSelect = () => {
    if (selectedUser) {
      // Map to RequestorDtoType — exclude the auth GUID (userId); backend persists employeeId
      const requestorDto: RequestorDtoType = {
        employeeId: selectedUser.employeeId,
        name: selectedUser.name,
        email: selectedUser.email,
        contactNo: selectedUser.contactNo,
        aoCode: selectedUser.aoCode,
        costCenterCode: selectedUser.costCenterCode,
        costCenterDescription: selectedUser.costCenterDescription,
        department: selectedUser.department,
      };
      onSelect(requestorDto);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedUser(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('searchUser.modalTitle')} size="lg">
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
            placeholder={t('searchUser.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Results List */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">{t('searchUser.loading')}</div>
            ) : searchQuery.trim().length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                {t('searchUser.typeToSearch')}
              </div>
            ) : !results || results.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">{t('searchUser.noResults')}</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {results.map(user => (
                  <button
                    key={user.employeeId}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedUser?.employeeId === user.employeeId
                        ? 'bg-primary-50 hover:bg-primary-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <Avatar name={user.name} size="lg" />

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.employeeId}
                        {user.department ? ` · ${user.department}` : ''}
                      </div>
                      {/* Secondary line: extra requestor detail to help disambiguate */}
                      <div className="text-xs text-gray-400 truncate">
                        {[
                          user.email,
                          user.aoCode ? `${t('fields.requestorAoCode')}: ${user.aoCode}` : null,
                          user.costCenterCode
                            ? `${t('fields.requestorCostCenterCode')}: ${user.costCenterCode}${
                                user.costCenterDescription
                                  ? ` - ${user.costCenterDescription}`
                                  : ''
                              }`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {selectedUser?.employeeId === user.employeeId && (
                      <Icon
                        name="circle-check"
                        style="solid"
                        className="w-5 h-5 text-primary-600"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleSelect} disabled={!selectedUser}>
            <Icon name="check" style="solid" className="w-4 h-4 mr-2" />
            {t('common:actions.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchUserModal;
