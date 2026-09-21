import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Rename a group in place: click, type, Enter to keep or Escape to drop.
 *
 * Lives in a hook because two places rename the same group — the group header and the split
 * view's rail — and the fiddly parts (focus and select on open, keep the draft in step with the
 * server value while idle, ignore an unchanged or empty name) are exactly the parts that go
 * quietly wrong when copied.
 */
export function useGroupRename(
  groupId: string,
  groupName: string,
  onRenameGroup: (groupId: string, newName: string) => void,
) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(groupName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setValue(groupName);
  }, [groupName, isEditing]);

  const commit = useCallback(() => {
    const trimmed = value.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== groupName) onRenameGroup(groupId, trimmed);
    else setValue(groupName);
  }, [groupId, groupName, onRenameGroup, value]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        setValue(groupName);
        setIsEditing(false);
      }
    },
    [commit, groupName],
  );

  return {
    isEditing,
    start: () => setIsEditing(true),
    value,
    setValue,
    inputRef,
    commit,
    onKeyDown,
  };
}
