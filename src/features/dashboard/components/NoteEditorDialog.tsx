import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import { useCreateNote, useUpdateNote } from '../api/hooks';
import type { NoteItem } from '../api/types';

const MAX_CHARS = 4_000;

interface NoteEditorDialogProps {
  open: boolean;
  note?: NoteItem;
  onClose: () => void;
}

function NoteEditorDialog({ open, note, onClose }: NoteEditorDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);
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
  const overCap = content.length > MAX_CHARS;
  const isInvalid = trimmed.length === 0 || overCap;

  const handleSave = () => {
    if (isInvalid || isPending) return;
    setError(null);

    if (note !== undefined) {
      updateNote.mutate(
        { id: note.id, content: trimmed },
        {
          onSuccess: onClose,
          onError: () => setError(t('notes.editor.saveError')),
        },
      );
    } else {
      createNote.mutate(trimmed, {
        onSuccess: onClose,
        onError: () => setError(t('notes.editor.saveError')),
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
      title={note !== undefined ? t('notes.editor.titleEdit') : t('notes.editor.titleNew')}
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            maxLength={MAX_CHARS}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('notes.editor.placeholder')}
            rows={6}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span
            className={`absolute bottom-2 right-2 text-xs ${
              overCap ? 'text-red-500 font-medium' : 'text-gray-400'
            }`}
          >
            {content.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>

        {overCap && <p className="text-sm text-red-500">{t('notes.editor.overCapError')}</p>}

        {error && !overCap && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isInvalid || isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('notes.editor.saving') : t('notes.editor.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default NoteEditorDialog;
