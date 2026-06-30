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
  /** The requestor currently set on the form — shown in the detail view until a new one is picked. */
  initialRequestor?: RequestorDtoType | null;
  /** Hide the "Search Requestor" action (e.g. read-only mode) — detail view only. */
  readOnly?: boolean;
}

/** Shared display shape so the detail view renders a search result or the current form requestor. */
interface RequestorDetail {
  employeeId: string;
  name: string | null;
  email: string | null;
  contactNo: string | null;
  aoCode: string | null;
  costCenterCode: string | null;
  costCenterDescription: string | null;
  department: string | null;
}

const SearchUserModal = ({
  isOpen,
  onClose,
  onSelect,
  initialRequestor,
  readOnly,
}: SearchUserModalProps) => {
  const { t } = useTranslation(['request', 'common']);
  // 'view' shows the current requestor's detail; 'search' lets the user pick a different one.
  const [mode, setMode] = useState<'view' | 'search'>('view');
  const [searchQuery, setSearchQuery] = useState('');
  // Highlighted search row (employeeId is the selection key).
  const [selectedUser, setSelectedUser] = useState<RequestorInfoDto | null>(null);

  const { data: results, isLoading } = useSearchRequestors(searchQuery);

  // Detail view reflects the requestor currently on the form.
  const detail: RequestorDetail | null = initialRequestor?.employeeId
    ? {
        employeeId: initialRequestor.employeeId,
        name: initialRequestor.name ?? null,
        email: initialRequestor.email ?? null,
        contactNo: initialRequestor.contactNo ?? null,
        aoCode: initialRequestor.aoCode ?? null,
        costCenterCode: initialRequestor.costCenterCode ?? null,
        costCenterDescription: initialRequestor.costCenterDescription ?? null,
        department: initialRequestor.department ?? null,
      }
    : null;

  // Cost center shown as "{code} - {description}", collapsing gracefully when either side is null.
  const costCenterDisplay =
    detail?.costCenterCode && detail.costCenterDescription
      ? `${detail.costCenterCode} - ${detail.costCenterDescription}`
      : (detail?.costCenterCode ?? detail?.costCenterDescription ?? null);

  const goToSearch = () => {
    setSearchQuery('');
    setSelectedUser(null);
    setMode('search');
  };

  const backToView = () => {
    setSearchQuery('');
    setSelectedUser(null);
    setMode('view');
  };

  const handleConfirm = () => {
    if (!selectedUser) return;
    // Map to RequestorDtoType — exclude the auth GUID (userId); backend persists employeeId.
    onSelect({
      employeeId: selectedUser.employeeId,
      name: selectedUser.name,
      email: selectedUser.email,
      contactNo: selectedUser.contactNo,
      aoCode: selectedUser.aoCode,
      costCenterCode: selectedUser.costCenterCode,
      costCenterDescription: selectedUser.costCenterDescription,
      department: selectedUser.department,
    });
    // Return to the detail view; it now shows the newly selected requestor via initialRequestor.
    backToView();
  };

  const handleClose = () => {
    backToView();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('forms.requestorDetail')} size="lg">
      <div className="flex flex-col gap-4">
        {mode === 'view' ? (
          <>
            {/* Detail view — current requestor's info. The search action lives on the Username
                field; show a standalone search button only when no requestor is set yet. */}
            {detail ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                {/* Username + name combined — carries the inline "search a different requestor" action */}
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400">{t('fields.requestorUsername')}</dt>
                  <dd className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-800 break-words">
                      {detail.employeeId
                        ? `${detail.employeeId}${detail.name ? ` - ${detail.name}` : ''}`
                        : (detail.name ?? <span className="text-gray-300">—</span>)}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={goToSearch}
                        title={t('forms.searchRequestor')}
                        aria-label={t('forms.searchRequestor')}
                        className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                      >
                        <Icon name="magnifying-glass" style="regular" className="w-4 h-4" />
                      </button>
                    )}
                  </dd>
                </div>
                {(
                  [
                    [t('fields.requestorEmail'), detail.email],
                    [t('fields.requestorContactNo'), detail.contactNo],
                    [t('fields.requestorAoCode'), detail.aoCode],
                    [t('fields.requestorCostCenterCode'), costCenterDisplay],
                    [t('fields.requestorDepartment'), detail.department],
                  ] as [string, string | null][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-400">{label}</dt>
                    <dd className="text-sm text-gray-800 mt-0.5 break-words">
                      {value || <span className="text-gray-300">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="text-gray-400">{t('searchUser.selectToViewDetail')}</p>
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={goToSearch}>
                    <Icon name="magnifying-glass" style="regular" className="w-4 h-4 mr-2" />
                    {t('forms.searchRequestor')}
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Search mode — find a different requestor by employee ID or name */}
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
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
              />
            </div>

            {/* Results List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    {t('searchUser.loading')}
                  </div>
                ) : searchQuery.trim().length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400">
                    {t('searchUser.typeToSearch')}
                  </div>
                ) : !results || results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    {t('searchUser.noResults')}
                  </div>
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
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </div>
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
              <Button variant="outline" onClick={backToView}>
                {t('common:actions.cancel')}
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedUser}>
                <Icon name="check" style="solid" className="w-4 h-4 mr-2" />
                {t('common:actions.confirm')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SearchUserModal;
