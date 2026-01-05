import { useState, useMemo } from 'react';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import type { UserDtoType } from '../schemas/form';

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: UserDtoType) => void;
}

// Mock data for development
const mockUsers: UserDtoType[] = [
  { userId: 'P000000001', username: 'Somchai Prasert' },
  { userId: 'P000000002', username: 'Nattaya Srisawat' },
  { userId: 'P000000003', username: 'Wichai Kongpan' },
  { userId: 'P000000004', username: 'Pranee Thongchai' },
  { userId: 'P000000005', username: 'Kittisak Wongprasert' },
  { userId: 'P000000006', username: 'Supaporn Limwattana' },
];

const SearchUserModal = ({ isOpen, onClose, onSelect }: SearchUserModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDtoType | null>(null);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return mockUsers;
    const query = searchQuery.toLowerCase();
    return mockUsers.filter(user => user.username.toLowerCase().includes(query));
  }, [searchQuery]);

  const handleSelect = () => {
    if (selectedUser) {
      onSelect(selectedUser);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedUser(null);
    onClose();
  };

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Select User" size="lg">
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
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Results List */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No users found matching your search.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <button
                    key={user.userId}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedUser?.userId === user.userId
                        ? 'bg-primary-50 hover:bg-primary-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {getInitials(user.username)}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.username}
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {selectedUser?.userId === user.userId && (
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
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedUser}>
            <Icon name="check" style="solid" className="w-4 h-4 mr-2" />
            Select
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchUserModal;
