import { useState } from 'react';
import Icon from '@/shared/components/Icon';
import type { SavedSearchDto } from '../../api/appraisalSearch';

interface SavedSearchesDropdownProps {
  savedSearches: SavedSearchDto[];
  onLoad: (search: SavedSearchDto) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

function SavedSearchesDropdown({
  savedSearches,
  onLoad,
  onSave,
  onDelete,
}: SavedSearchesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    if (newName.trim()) {
      onSave(newName.trim());
      setNewName('');
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
      >
        <Icon style="solid" name="bookmark" className="size-3" />
        Saved
        {savedSearches.length > 0 && (
          <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px]">
            {savedSearches.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setIsOpen(false);
              setIsSaving(false);
            }}
          />
          <div
            className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-40"
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setIsSaving(false);
              }
            }}
          >
            <div className="p-2 border-b border-gray-100">
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="Search name..."
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-primary outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsSaving(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSaving(true)}
                  className="w-full text-left text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <Icon style="solid" name="plus" className="size-3" />
                  Save current search
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {savedSearches.length === 0 ? (
                <p className="p-3 text-xs text-gray-400 text-center">No saved searches yet</p>
              ) : (
                savedSearches.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 group cursor-pointer"
                    onClick={() => {
                      onLoad(s);
                      setIsOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDelete(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <Icon style="solid" name="trash" className="size-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SavedSearchesDropdown;
