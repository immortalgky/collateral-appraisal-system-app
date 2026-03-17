import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import type { ToolbarProps, AnnotationTool } from './types';
import { TOOL_ICONS, TOOL_LABELS } from './constants';

const TOOL_GROUPS: AnnotationTool[][] = [
  ['select'],
  ['freehand', 'line', 'arrow'],
  ['rect', 'circle'],
  ['text', 'number'],
  ['sticker'],
  ['eraser'],
];

export default function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onSkip,
  onCancel,
  isSaving,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
      {/* Tool groups */}
      <div className="flex items-center gap-1">
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {gi > 0 && <div className="w-px h-6 bg-gray-700 mx-1" />}
            {group.map(tool => (
              <button
                key={tool}
                type="button"
                onClick={() => onToolChange(tool)}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  activeTool === tool
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700',
                )}
                title={`${TOOL_LABELS[tool]} (${tool[0].toUpperCase()})`}
              >
                <Icon name={TOOL_ICONS[tool]} className="text-sm" />
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Right side: undo/redo + actions */}
      <div className="flex items-center gap-1">
        {/* Undo/Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Icon name="rotate-left" className="text-sm" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Icon name="rotate-right" className="text-sm" />
        </button>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {/* Action buttons */}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Skip
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isSaving && (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
