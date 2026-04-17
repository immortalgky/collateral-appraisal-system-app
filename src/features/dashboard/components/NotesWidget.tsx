import { useState } from 'react';
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
      className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="p-2 rounded-full bg-amber-50 shrink-0 mt-0.5">
        <Icon name="note-sticky" style="solid" className="size-4 text-amber-500" />
      </div>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-sm text-gray-800 line-clamp-2 break-words">{note.content}</p>
        <span className="text-xs text-gray-400">{relativeTime}</span>
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
          aria-label="Edit note"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
        >
          <Icon name="pen" style="solid" className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(note)}
          aria-label="Delete note"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Icon name="trash" style="solid" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-800">Notes</h3>
          <button
            type="button"
            onClick={handleOpenNew}
            className="text-sm font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="plus" style="solid" className="size-3.5" />
            Add new
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isLoading ? (
            <NotesSkeleton />
          ) : notes.length > 0 ? (
            notes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Icon name="note-sticky" style="regular" className="size-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-3">
                No notes yet — add one to get started.
              </p>
              <button
                type="button"
                onClick={handleOpenNew}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
              >
                Add new
              </button>
            </div>
          )}
        </div>
      </div>

      <NoteEditorDialog
        open={editorOpen}
        note={editingNote}
        onClose={() => setEditorOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmNote !== null}
        onClose={() => setConfirmNote(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Note"
        message="This note will be permanently deleted. Continue?"
        confirmText="Delete"
        variant="danger"
        isLoading={deleteNote.isPending}
      />
    </WidgetWrapper>
  );
}

export default NotesWidget;
