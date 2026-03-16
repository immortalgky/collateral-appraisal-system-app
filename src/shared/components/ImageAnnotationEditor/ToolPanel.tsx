import type { ToolPanelProps } from './types';
import { STROKE_WIDTH_PRESETS, FONT_SIZE_PRESETS } from './constants';
import ColorPicker from './ColorPicker';
import StickerPicker from './StickerPicker';
import clsx from 'clsx';

export default function ToolPanel({
  activeTool,
  toolOptions,
  onToolOptionsChange,
  selectedSticker,
  onStickerSelect,
  selectedObjectInfo,
  onSelectedObjectStyleChange,
}: ToolPanelProps) {
  // --- Tool-specific options (when drawing) ---
  const showStroke = ['freehand', 'line', 'arrow', 'rect', 'circle'].includes(activeTool);
  const showFill = ['rect', 'circle'].includes(activeTool);
  const showTextColor = ['text', 'number'].includes(activeTool);
  const showFontSize = ['text', 'number'].includes(activeTool);
  const showStickers = activeTool === 'sticker';

  // --- Selection-based options (when objects are selected) ---
  const hasSelection = selectedObjectInfo !== null && selectedObjectInfo.count > 0;
  const selType = selectedObjectInfo?.type;
  const selIsText = selType === 'text';
  const selIsShape = selType === 'shape';
  const selIsGroup = selType === 'group';

  const showToolOptions = showStroke || showFill || showTextColor || showFontSize || showStickers;

  if (!showToolOptions && !hasSelection) {
    return null;
  }

  return (
    <div className="w-52 bg-gray-800 border-l border-gray-700 p-3 flex flex-col gap-4 overflow-y-auto">
      {/* === Tool options (for new objects) === */}
      {showStroke && (
        <>
          <ColorPicker
            value={toolOptions.strokeColor}
            onChange={color => onToolOptionsChange({ strokeColor: color })}
            label="Stroke Color"
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Stroke Width</span>
            <div className="flex gap-1.5">
              {STROKE_WIDTH_PRESETS.map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onToolOptionsChange({ strokeWidth: w })}
                  className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors',
                    toolOptions.strokeWidth === w
                      ? 'bg-primary text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {showFill && (
        <ColorPicker
          value={toolOptions.fillColor}
          onChange={color => onToolOptionsChange({ fillColor: color })}
          label="Fill Color"
        />
      )}

      {showTextColor && (
        <ColorPicker
          value={toolOptions.strokeColor}
          onChange={color => onToolOptionsChange({ strokeColor: color })}
          label="Text Color"
        />
      )}

      {showFontSize && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-400 font-medium">Font Size</span>
          <div className="flex gap-1.5">
            {FONT_SIZE_PRESETS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onToolOptionsChange({ fontSize: s })}
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors',
                  toolOptions.fontSize === s
                    ? 'bg-primary text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {showStickers && (
        <StickerPicker selectedSticker={selectedSticker} onSelect={onStickerSelect} />
      )}

      {showToolOptions && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-400 font-medium">
            Opacity: {Math.round(toolOptions.opacity * 100)}%
          </span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={toolOptions.opacity}
            onChange={e => onToolOptionsChange({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      )}

      {/* === Selected object options === */}
      {hasSelection && (
        <>
          {showToolOptions && (
            <div className="border-t border-gray-600 pt-3 -mx-3 px-3">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Selected ({selectedObjectInfo.count})
              </span>
            </div>
          )}

          {!showToolOptions && (
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Selected ({selectedObjectInfo.count})
            </span>
          )}

          {/* Color for selected objects */}
          {(selIsText || selIsGroup) && (
            <ColorPicker
              value={selectedObjectInfo.fillColor ?? selectedObjectInfo.strokeColor ?? '#FFFFFF'}
              onChange={color => onSelectedObjectStyleChange({ strokeColor: color })}
              label="Color"
            />
          )}

          {selIsShape && (
            <>
              <ColorPicker
                value={selectedObjectInfo.strokeColor ?? '#FFFFFF'}
                onChange={color => onSelectedObjectStyleChange({ strokeColor: color })}
                label="Stroke Color"
              />
              <ColorPicker
                value={selectedObjectInfo.fillColor ?? 'transparent'}
                onChange={color => onSelectedObjectStyleChange({ fillColor: color })}
                label="Fill Color"
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-400 font-medium">Stroke Width</span>
                <div className="flex gap-1.5">
                  {STROKE_WIDTH_PRESETS.map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onSelectedObjectStyleChange({ strokeWidth: w })}
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors',
                        selectedObjectInfo.strokeWidth === w
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Font size for text / number markers */}
          {(selIsText || selIsGroup) && selectedObjectInfo.fontSize !== undefined && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Font Size</span>
              <div className="flex gap-1.5">
                {FONT_SIZE_PRESETS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSelectedObjectStyleChange({ fontSize: s })}
                    className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors',
                      selectedObjectInfo.fontSize === s
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opacity for selected */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-medium">
              Opacity: {Math.round((selectedObjectInfo.opacity ?? 1) * 100)}%
            </span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={selectedObjectInfo.opacity ?? 1}
              onChange={e => onSelectedObjectStyleChange({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </>
      )}
    </div>
  );
}
