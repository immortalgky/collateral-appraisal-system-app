import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import Modal from '@shared/components/Modal';
import { useCreateNote, useUpdateNote } from '../api/hooks';
import type { NoteItem } from '../api/types';

const MAX_CHARS = 10_000;

interface NoteEditorDialogProps {
  open: boolean;
  note?: NoteItem;
  onClose: () => void;
}

function NoteEditorDialog({ open, note, onClose }: NoteEditorDialogProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const isPending = createNote.isPending || updateNote.isPending;

  // Reset state whenever the dialog opens
  useEffect(() => {
    if (open) {
      setContent(note?.content ?? '');
      setError(null);
    }
  }, [open, note]);

  // Autofocus textarea on open
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  const trimmed = content.trim();
  const isInvalid = trimmed.length === 0 || content.length > MAX_CHARS;

  const handleSave = () => {
    if (isInvalid || isPending) return;
    setError(null);

    if (note !== undefined) {
      updateNote.mutate(
        { id: note.id, content: trimmed },
        {
          onSuccess: onClose,
          onError: () => setError('Failed to save — try again.'),
        }
      );
    } else {
      createNote.mutate(trimmed, {
        onSuccess: onClose,
        onError: () => setError('Failed to save — try again.'),
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={note !== undefined ? 'Edit Note' : 'New Note'}
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your note..."
            rows={6}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span
            className={`absolute bottom-2 right-2 text-xs ${
              content.length > MAX_CHARS ? 'text-red-500 font-medium' : 'text-gray-400'
            }`}
          >
            {content.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isInvalid || isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default NoteEditorDialog;
