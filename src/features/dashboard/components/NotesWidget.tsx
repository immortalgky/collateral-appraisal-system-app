import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import WidgetWrapper from './WidgetWrapper';
import NoteEditorDialog from './NoteEditorDialog';
import { useNotes, useDeleteNote } from '../api/hooks';
import type { NoteItem } from '../api/types';

function NoteRow({
  note,
  onEdit,
  onDelete,
}: {
  note: NoteItem;
  onEdit: (note: NoteItem) => void;
  onDelete: (note: NoteItem) => void;
}) {
  const { t } = useTranslation('dashboard');
  const [hovered, setHovered] = useState(false);

  const relativeTime = (() => {
    try {
      return formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });
    } catch {
      return note.updatedAt;
    }
  })();

  return (
    <div
      className="flex items-start gap-3 px-5 py-4 hover:bg-(--palette-surface-2) transition-colors group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="p-2 rounded-full bg-(--palette-warn-wash) shrink-0 mt-0.5">
        <Icon name="note-sticky" style="solid" className="size-4 text-amber-500" />
      </div>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-sm text-(--palette-ink) line-clamp-2 break-words">{note.content}</p>
        <span className="text-xs text-(--palette-gray-400)">{relativeTime}</span>
      </div>

      {/* Hover actions */}
      <div
        className={`flex items-center gap-1 shrink-0 transition-opacity ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => onEdit(note)}
          aria-label={t('notes.aria.editNote')}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-(--palette-gray-400) hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
        >
          <Icon name="pen" style="solid" className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(note)}
          aria-label={t('notes.aria.deleteNote')}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-(--palette-gray-400) hover:bg-(--palette-req-wash) hover:text-red-500 transition-colors"
        >
          <Icon name="trash" style="solid" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="divide-y divide-(--palette-line-soft)">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-5 py-4">
          <Skeleton variant="circular" className="size-8 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesWidget() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useNotes();
  const deleteNote = useDeleteNote();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | undefined>(undefined);
  const [confirmNote, setConfirmNote] = useState<NoteItem | null>(null);

  const handleOpenNew = () => {
    setEditingNote(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (note: NoteItem) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const handleDeleteRequest = (note: NoteItem) => {
    setConfirmNote(note);
  };

  const handleDeleteConfirm = () => {
    if (!confirmNote) return;
    deleteNote.mutate(confirmNote.id, {
      onSettled: () => setConfirmNote(null),
    });
  };

  const notes = data?.items ?? [];

  return (
    <WidgetWrapper id="notes">
      <div className="bg-(--palette-surface) rounded-2xl shadow-sm border border-(--palette-line-soft) h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--palette-line-soft) shrink-0">
          <h3 className="text-base font-semibold text-(--palette-ink)">{t('notes.title')}</h3>
          <button
            type="button"
            onClick={handleOpenNew}
            className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="plus" style="solid" className="size-3.5" />
            {t('notes.addNew')}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-(--palette-line-soft)">
          {isLoading ? (
            <NotesSkeleton />
          ) : notes.length > 0 ? (
            notes.map(note => (
              <NoteRow
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto w-12 h-12 bg-(--palette-surface-3) rounded-full flex items-center justify-center mb-3">
                <Icon
                  name="note-sticky"
                  style="regular"
                  className="size-5 text-(--palette-gray-400)"
                />
              </div>
              <p className="text-sm text-(--palette-gray-500) mb-3">{t('notes.emptyMessage')}</p>
              <button
                type="button"
                onClick={handleOpenNew}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {t('notes.addNew')}
              </button>
            </div>
          )}
        </div>
      </div>

      <NoteEditorDialog open={editorOpen} note={editingNote} onClose={() => setEditorOpen(false)} />

      <ConfirmDialog
        isOpen={confirmNote !== null}
        onClose={() => setConfirmNote(null)}
        onConfirm={handleDeleteConfirm}
        title={t('notes.delete.title')}
        message={t('notes.delete.message')}
        confirmText={t('notes.delete.confirm')}
        variant="danger"
        isLoading={deleteNote.isPending}
      />
    </WidgetWrapper>
  );
}

export default NotesWidget;
