import type { Canvas as FabricCanvas } from 'fabric';

export type AnnotationTool =
  | 'select'
  | 'text'
  | 'number'
  | 'arrow'
  | 'line'
  | 'rect'
  | 'circle'
  | 'freehand'
  | 'sticker'
  | 'eraser';

export interface ToolOptions {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  opacity: number;
}

export interface EditorState {
  activeTool: AnnotationTool;
  toolOptions: ToolOptions;
  numberCounter: number;
  selectedSticker: string | null;
  isExporting: boolean;
}

export interface AnnotationResult {
  imageBlob: Blob;
  fabricJson: string;
  fileName: string;
}

export interface ImageAnnotationEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile?: File;
  imageUrl?: string;
  onSave: (result: AnnotationResult) => Promise<void>;
  onSkip?: () => void;
  fileName?: string;
}

export interface SelectedObjectInfo {
  type: 'text' | 'shape' | 'group' | 'image' | 'unknown';
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  opacity?: number;
  count: number;
}

export interface FabricCanvasProps {
  imageFile?: File;
  imageUrl?: string;
  activeTool: AnnotationTool;
  toolOptions: ToolOptions;
  numberCounter: number;
  selectedSticker: string | null;
  onNumberPlaced: () => void;
  onCanvasReady: (canvas: FabricCanvas) => void;
  onSelectionChange: (info: SelectedObjectInfo | null) => void;
}

export interface ToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onSkip?: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export interface ToolPanelProps {
  activeTool: AnnotationTool;
  toolOptions: ToolOptions;
  onToolOptionsChange: (options: Partial<ToolOptions>) => void;
  selectedSticker: string | null;
  onStickerSelect: (stickerUrl: string) => void;
  selectedObjectInfo: SelectedObjectInfo | null;
  onSelectedObjectStyleChange: (options: Partial<ToolOptions>) => void;
}
