import { useCallback, useEffect, useRef, useState } from 'react';
import type { Canvas } from 'fabric';
import { IText, FabricText, Group, Line, ActiveSelection } from 'fabric';
import type { ImageAnnotationEditorProps, EditorState, AnnotationTool, ToolOptions, SelectedObjectInfo } from './types';
import { DEFAULT_TOOL_OPTIONS } from './constants';
import Toolbar from './Toolbar';
import FabricCanvas from './FabricCanvas';
import ToolPanel from './ToolPanel';
import { useAnnotationHistory } from './useAnnotationHistory';
import { useCanvasExport } from './useCanvasExport';

export default function ImageAnnotationEditor({
  isOpen,
  onClose,
  imageFile,
  imageUrl,
  onSave,
  onSkip,
  fileName,
}: ImageAnnotationEditorProps) {
  const canvasRef = useRef<Canvas | null>(null);
  const [state, setState] = useState<EditorState>({
    activeTool: 'select',
    toolOptions: DEFAULT_TOOL_OPTIONS,
    numberCounter: 1,
    selectedSticker: null,
    isExporting: false,
  });

  const [selectedObjectInfo, setSelectedObjectInfo] = useState<SelectedObjectInfo | null>(null);

  const { saveSnapshot, undo, redo, canUndo, canRedo, reset } = useAnnotationHistory(canvasRef);
  const { exportCanvas, getCanvasJson } = useCanvasExport(canvasRef);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected object(s)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        const canvas = canvasRef.current;
        if (canvas) {
          const active = canvas.getActiveObject();
          // Don't delete if we're editing text
          if (active && !(active as any).isEditing) {
            const objects = canvas.getActiveObjects();
            canvas.discardActiveObject();
            objects.forEach(obj => canvas.remove(obj));
            canvas.renderAll();
            saveSnapshot();
          }
        }
      }

      // Select all (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (canvas) {
          const allObjects = canvas.getObjects();
          if (allObjects.length > 0) {
            const sel = new ActiveSelection(allObjects, { canvas });
            canvas.setActiveObject(sel);
            canvas.renderAll();
          }
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Escape
      if (e.key === 'Escape') {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }

      // Tool shortcuts
      const toolKeys: Record<string, AnnotationTool> = {
        v: 'select',
        t: 'text',
        n: 'number',
        a: 'arrow',
        l: 'line',
        r: 'rect',
        c: 'circle',
        f: 'freehand',
        s: 'sticker',
        e: 'eraser',
      };

      if (!e.ctrlKey && !e.metaKey && !e.altKey && toolKeys[e.key]) {
        // Don't change tool while editing text
        const canvas = canvasRef.current;
        const active = canvas?.getActiveObject();
        if (active && (active as any).isEditing) return;

        setState(prev => ({ ...prev, activeTool: toolKeys[e.key] }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, undo, redo, saveSnapshot]);

  const handleCanvasReady = useCallback(
    (canvas: Canvas) => {
      canvasRef.current = canvas;

      // Save initial snapshot after image loads
      canvas.on('after:render', function initialSnapshot() {
        if (canvas.backgroundImage) {
          canvas.off('after:render', initialSnapshot);
          setTimeout(() => saveSnapshot(), 100);
        }
      });

      // Save snapshot on object modifications
      canvas.on('object:added', () => saveSnapshot());
      canvas.on('object:modified', () => saveSnapshot());
      canvas.on('object:removed', () => saveSnapshot());
    },
    [saveSnapshot],
  );

  const handleToolChange = useCallback((tool: AnnotationTool) => {
    setState(prev => ({ ...prev, activeTool: tool }));
  }, []);

  const handleToolOptionsChange = useCallback((opts: Partial<ToolOptions>) => {
    setState(prev => ({
      ...prev,
      toolOptions: { ...prev.toolOptions, ...opts },
    }));
  }, []);

  const handleSelectionChange = useCallback((info: SelectedObjectInfo | null) => {
    setSelectedObjectInfo(info);
  }, []);

  const handleSelectedObjectStyleChange = useCallback((opts: Partial<ToolOptions>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const objects = canvas.getActiveObjects();
    if (objects.length === 0) return;

    for (const obj of objects) {
      if (opts.strokeColor !== undefined) {
        // For text objects, change fill (text color)
        if (obj instanceof IText || obj instanceof FabricText) {
          obj.set('fill', opts.strokeColor);
        } else if (obj instanceof Group) {
          // Groups: arrows (Line + Triangle) or number markers (Circle + Text)
          const children = obj.getObjects();
          for (const child of children) {
            if (child instanceof FabricText) {
              // keep text white for number markers
            } else if (child instanceof Line) {
              child.set('stroke', opts.strokeColor);
            } else {
              child.set('fill', opts.strokeColor);
            }
          }
        } else {
          obj.set('stroke', opts.strokeColor);
        }
      }
      if (opts.fillColor !== undefined) {
        if (!(obj instanceof IText) && !(obj instanceof FabricText)) {
          obj.set('fill', opts.fillColor === 'transparent' ? '' : opts.fillColor);
        }
      }
      if (opts.strokeWidth !== undefined) {
        obj.set('strokeWidth', opts.strokeWidth);
      }
      if (opts.fontSize !== undefined) {
        if (obj instanceof IText || obj instanceof FabricText) {
          obj.set('fontSize', opts.fontSize);
        } else if (obj instanceof Group) {
          for (const child of obj.getObjects()) {
            if (child instanceof FabricText) {
              child.set('fontSize', opts.fontSize);
            }
          }
        }
      }
      if (opts.opacity !== undefined) {
        obj.set('opacity', opts.opacity);
      }
    }

    canvas.renderAll();
    saveSnapshot();
    // Re-emit selection info with updated values
    setSelectedObjectInfo(prev => prev ? { ...prev, ...opts } : prev);
  }, [saveSnapshot]);

  const handleStickerSelect = useCallback((stickerUrl: string) => {
    setState(prev => ({
      ...prev,
      selectedSticker: stickerUrl,
      activeTool: 'sticker',
    }));
  }, []);

  const handleNumberPlaced = useCallback(() => {
    setState(prev => ({ ...prev, numberCounter: prev.numberCounter + 1 }));
  }, []);

  const handleSave = useCallback(async () => {
    setState(prev => ({ ...prev, isExporting: true }));
    try {
      const blob = await exportCanvas();
      if (!blob) throw new Error('Failed to export canvas');

      const json = getCanvasJson();
      const resultFileName = fileName?.replace(/\.[^.]+$/, '.png') ?? 'annotated.png';

      await onSave({
        imageBlob: blob,
        fabricJson: json,
        fileName: resultFileName,
      });

      onClose();
    } catch (error) {
      console.error('Failed to save annotation:', error);
    } finally {
      setState(prev => ({ ...prev, isExporting: false }));
    }
  }, [exportCanvas, getCanvasJson, fileName, onSave, onClose]);

  const handleCancel = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSkip = useCallback(() => {
    reset();
    onSkip?.();
  }, [reset, onSkip]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Toolbar */}
      <Toolbar
        activeTool={state.activeTool}
        onToolChange={handleToolChange}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onSave={handleSave}
        onSkip={onSkip ? handleSkip : undefined}
        onCancel={handleCancel}
        isSaving={state.isExporting}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <FabricCanvas
          imageFile={imageFile}
          imageUrl={imageUrl}
          activeTool={state.activeTool}
          toolOptions={state.toolOptions}
          numberCounter={state.numberCounter}
          selectedSticker={state.selectedSticker}
          onNumberPlaced={handleNumberPlaced}
          onCanvasReady={handleCanvasReady}
          onSelectionChange={handleSelectionChange}
        />

        {/* Right panel */}
        <ToolPanel
          activeTool={state.activeTool}
          toolOptions={state.toolOptions}
          onToolOptionsChange={handleToolOptionsChange}
          selectedSticker={state.selectedSticker}
          onStickerSelect={handleStickerSelect}
          selectedObjectInfo={selectedObjectInfo}
          onSelectedObjectStyleChange={handleSelectedObjectStyleChange}
        />
      </div>

      {/* File name indicator */}
      {fileName && (
        <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 text-center">
          {fileName}
        </div>
      )}
    </div>
  );
}
