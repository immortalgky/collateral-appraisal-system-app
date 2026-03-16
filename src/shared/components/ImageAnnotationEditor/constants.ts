import type { ToolOptions, AnnotationTool } from './types';

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  strokeColor: '#FF0000',
  fillColor: 'transparent',
  strokeWidth: 3,
  fontSize: 24,
  opacity: 1,
};

export const COLOR_PRESETS = [
  '#FF0000', // Red
  '#FF6600', // Orange
  '#FFCC00', // Yellow
  '#00CC00', // Green
  '#0066FF', // Blue
  '#9933FF', // Purple
  '#FF3399', // Pink
  '#000000', // Black
  '#666666', // Gray
  '#FFFFFF', // White
];

export const STROKE_WIDTH_PRESETS = [1, 2, 3, 5, 8];

export const FONT_SIZE_PRESETS = [14, 18, 24, 32, 48];

export const TOOL_LABELS: Record<AnnotationTool, string> = {
  select: 'Select',
  text: 'Text',
  number: 'Number',
  arrow: 'Arrow',
  line: 'Line',
  rect: 'Rectangle',
  circle: 'Circle',
  freehand: 'Freehand',
  sticker: 'Sticker',
  eraser: 'Eraser',
};

export const TOOL_ICONS: Record<AnnotationTool, string> = {
  select: 'arrow-pointer',
  text: 'font',
  number: 'hashtag',
  arrow: 'arrow-right-long',
  line: 'minus',
  rect: 'square',
  circle: 'circle',
  freehand: 'pen',
  sticker: 'note-sticky',
  eraser: 'eraser',
};

export const MAX_HISTORY_SIZE = 50;

export const NUMBER_MARKER_RADIUS = 16;
export const NUMBER_MARKER_COLORS = ['#FF0000', '#0066FF', '#00CC00', '#FF6600', '#9933FF'];
