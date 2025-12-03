import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import type { Note } from '../types';

type NotesWidgetProps = {
  notes?: Note[];
  onAddNote?: () => void;
};

function NotesWidget({ notes, onAddNote }: NotesWidgetProps) {
  // Mock data if not provided
  const noteData: Note[] = notes || [
    { id: '1', content: 'Contact customer K.John', time: 'Today - 09.00' },
  ];

  return (
    <WidgetWrapper id="notes">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Notes</h3>
          <button
            type="button"
            onClick={onAddNote}
            className="text-sm font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="plus" style="solid" className="size-3.5" />
            Add new
          </button>
        </div>

        {/* Notes list */}
        <div className="divide-y divide-gray-100">
          {noteData.length > 0 ? (
            noteData.map((note) => (
              <div key={note.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-full bg-amber-50">
                  <Icon name="note-sticky" style="solid" className="size-4 text-amber-500" />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{note.content}</span>
                  <span className="text-xs text-gray-400">{note.time}</span>
                </div>
                <button type="button" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <Icon name="ellipsis-vertical" style="solid" className="size-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Icon name="note-sticky" style="regular" className="size-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No notes yet</p>
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default NotesWidget;
