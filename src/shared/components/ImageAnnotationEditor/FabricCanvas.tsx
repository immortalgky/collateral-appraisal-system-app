import { useEffect, useRef, useCallback } from 'react';
import {
  Canvas,
  FabricImage,
  Rect,
  Circle,
  Line,
  IText,
  Group,
  FabricText,
  PencilBrush,
  FabricObject,
  Triangle,
} from 'fabric';
import type { FabricCanvasProps, SelectedObjectInfo } from './types';
import { NUMBER_MARKER_RADIUS, NUMBER_MARKER_COLORS } from './constants';

function getObjectInfo(canvas: Canvas): SelectedObjectInfo | null {
  const active = canvas.getActiveObject();
  if (!active) return null;

  const objects = canvas.getActiveObjects();
  const count = objects.length;

  if (count === 0) return null;

  // Use the first object for style info
  const obj = objects[0];

  let type: SelectedObjectInfo['type'] = 'unknown';
  if (obj instanceof IText || obj instanceof FabricText) {
    type = 'text';
  } else if (obj instanceof Group) {
    type = 'group';
  } else if (obj instanceof FabricImage) {
    type = 'image';
  } else if (obj instanceof Rect || obj instanceof Circle || obj instanceof Line || obj instanceof Triangle) {
    type = 'shape';
  }

  return {
    type,
    strokeColor: (obj.stroke as string) || undefined,
    fillColor: (obj.fill as string) || undefined,
    strokeWidth: obj.strokeWidth,
    fontSize: 'fontSize' in obj ? (obj as any).fontSize : undefined,
    opacity: active.opacity ?? 1,
    count,
  };
}

export default function FabricCanvas({
  imageFile,
  imageUrl,
  activeTool,
  toolOptions,
  numberCounter,
  selectedSticker,
  onNumberPlaced,
  onCanvasReady,
  onSelectionChange,
}: FabricCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const drawingRef = useRef<{
    isDrawing: boolean;
    startX: number;
    startY: number;
    shape: FabricObject | null;
  }>({ isDrawing: false, startX: 0, startY: 0, shape: null });

  // Initialize canvas
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = new Canvas(canvasElRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: '#1a1a1a',
      selection: true,
    });

    fabricRef.current = canvas;
    onCanvasReady(canvas);

    // Track selection changes
    const emitSelection = () => onSelectionChange(getObjectInfo(canvas));
    canvas.on('selection:created', emitSelection);
    canvas.on('selection:updated', emitSelection);
    canvas.on('selection:cleared', () => onSelectionChange(null));

    // Load background image — delay slightly to ensure container has layout dimensions
    const loadImage = async () => {
      let imgUrl: string;
      let shouldRevoke = false;

      if (imageFile) {
        imgUrl = URL.createObjectURL(imageFile);
        shouldRevoke = true;
      } else if (imageUrl) {
        imgUrl = imageUrl;
      } else {
        return;
      }

      try {
        const img = await FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' });

        // Use container's current dimensions (flex layout should be resolved by now)
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const imgW = img.width ?? 1;
        const imgH = img.height ?? 1;
        const scale = Math.min(containerW / imgW, containerH / imgH);

        const canvasW = Math.round(imgW * scale);
        const canvasH = Math.round(imgH * scale);

        canvas.setDimensions({ width: canvasW, height: canvasH });

        img.scaleX = scale;
        img.scaleY = scale;
        canvas.backgroundImage = img;
        canvas.renderAll();
      } finally {
        if (shouldRevoke) {
          URL.revokeObjectURL(imgUrl);
        }
      }
    };

    // Wait a frame so the flex container is fully laid out
    requestAnimationFrame(() => void loadImage());

    // Resize handler
    const handleResize = () => {
      if (!fabricRef.current || !container) return;
      const bgImg = fabricRef.current.backgroundImage;
      if (bgImg) {
        const imgW = bgImg.width ?? 1;
        const imgH = bgImg.height ?? 1;
        const scale = Math.min(container.clientWidth / imgW, container.clientHeight / imgH);
        fabricRef.current.setDimensions({
          width: imgW * scale,
          height: imgH * scale,
        });
        bgImg.scaleX = scale;
        bgImg.scaleY = scale;
        fabricRef.current.renderAll();
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile, imageUrl]);

  // Update drawing mode based on active tool
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (activeTool === 'freehand') {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = toolOptions.strokeColor;
      brush.width = toolOptions.strokeWidth;
      canvas.freeDrawingBrush = brush;
    } else {
      canvas.isDrawingMode = false;
    }

    // Toggle selection
    canvas.selection = activeTool === 'select' || activeTool === 'eraser';
    canvas.forEachObject(obj => {
      obj.selectable = activeTool === 'select' || activeTool === 'eraser';
      obj.evented = activeTool === 'select' || activeTool === 'eraser';
    });

    canvas.defaultCursor =
      activeTool === 'select' ? 'default' : activeTool === 'eraser' ? 'pointer' : 'crosshair';

    canvas.renderAll();
  }, [activeTool, toolOptions.strokeColor, toolOptions.strokeWidth]);

  // Handle shape/tool mouse events
  const handleMouseDown = useCallback(
    (e: { e: MouseEvent; absolutePointer?: { x: number; y: number } }) => {
      const canvas = fabricRef.current;
      if (!canvas || activeTool === 'select' || activeTool === 'freehand') return;

      const pointer = canvas.getScenePoint(e.e);
      if (!pointer) return;

      // Find object under pointer (works even when evented is false)
      const hitTarget = canvas.getObjects().reverse().find(obj => obj.containsPoint(pointer));

      if (activeTool === 'eraser') {
        if (hitTarget) {
          canvas.remove(hitTarget);
          canvas.renderAll();
        }
        return;
      }

      // If clicking on an existing object, select it instead of creating a new one
      if (hitTarget) {
        hitTarget.selectable = true;
        hitTarget.evented = true;
        canvas.setActiveObject(hitTarget);
        // Enter editing mode for text objects
        if (hitTarget instanceof IText) {
          hitTarget.enterEditing();
        }
        canvas.renderAll();
        return;
      }

      if (activeTool === 'text') {
        const text = new IText('Type here', {
          left: pointer.x,
          top: pointer.y,
          fontSize: toolOptions.fontSize,
          fill: toolOptions.strokeColor,
          opacity: toolOptions.opacity,
          fontFamily: 'Arial',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
        return;
      }

      if (activeTool === 'number') {
        const colorIdx = (numberCounter - 1) % NUMBER_MARKER_COLORS.length;
        const color = NUMBER_MARKER_COLORS[colorIdx];
        // Scale circle radius based on font size (fontSize is the text size, circle wraps it)
        const radius = Math.max(toolOptions.fontSize * 0.75, NUMBER_MARKER_RADIUS);

        const circle = new Circle({
          radius,
          fill: color,
          originX: 'center',
          originY: 'center',
        });

        const text = new FabricText(String(numberCounter), {
          fontSize: toolOptions.fontSize,
          fill: '#FFFFFF',
          fontWeight: 'bold',
          fontFamily: 'Arial',
          originX: 'center',
          originY: 'center',
        });

        const group = new Group([circle, text], {
          left: pointer.x - radius,
          top: pointer.y - radius,
          opacity: toolOptions.opacity,
        });

        canvas.add(group);
        canvas.renderAll();
        onNumberPlaced();
        return;
      }

      if (activeTool === 'sticker' && selectedSticker) {
        // Rasterize SVG to a temp canvas first, then create FabricImage
        // This ensures SVG <text> and other elements render correctly
        const targetSize = 80;
        const renderSize = 160; // 2x for crisp rendering
        const imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';
        imgEl.onload = () => {
          const offscreen = document.createElement('canvas');
          offscreen.width = renderSize;
          offscreen.height = renderSize;
          const ctx = offscreen.getContext('2d')!;
          ctx.drawImage(imgEl, 0, 0, renderSize, renderSize);

          const fabricImg = new FabricImage(offscreen, {
            left: pointer.x - targetSize / 2,
            top: pointer.y - targetSize / 2,
            scaleX: targetSize / renderSize,
            scaleY: targetSize / renderSize,
            opacity: toolOptions.opacity,
          });
          canvas.add(fabricImg);
          canvas.renderAll();
        };
        imgEl.src = selectedSticker;
        return;
      }

      // Shape drawing tools: line, arrow, rect, circle
      drawingRef.current.isDrawing = true;
      drawingRef.current.startX = pointer.x;
      drawingRef.current.startY = pointer.y;

      let shape: FabricObject | null = null;

      if (activeTool === 'line' || activeTool === 'arrow') {
        shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: toolOptions.strokeColor,
          strokeWidth: toolOptions.strokeWidth,
          opacity: toolOptions.opacity,
          selectable: false,
          evented: false,
        });
      } else if (activeTool === 'rect') {
        shape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          stroke: toolOptions.strokeColor,
          strokeWidth: toolOptions.strokeWidth,
          fill: toolOptions.fillColor === 'transparent' ? '' : toolOptions.fillColor,
          opacity: toolOptions.opacity,
          selectable: false,
          evented: false,
        });
      } else if (activeTool === 'circle') {
        shape = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          stroke: toolOptions.strokeColor,
          strokeWidth: toolOptions.strokeWidth,
          fill: toolOptions.fillColor === 'transparent' ? '' : toolOptions.fillColor,
          opacity: toolOptions.opacity,
          selectable: false,
          evented: false,
        });
      }

      if (shape) {
        drawingRef.current.shape = shape;
        canvas.add(shape);
      }
    },
    [activeTool, toolOptions, numberCounter, selectedSticker, onNumberPlaced],
  );

  const handleMouseMove = useCallback(
    (e: { e: MouseEvent }) => {
      const canvas = fabricRef.current;
      if (!canvas || !drawingRef.current.isDrawing || !drawingRef.current.shape) return;

      const pointer = canvas.getScenePoint(e.e);
      if (!pointer) return;

      const { startX, startY, shape } = drawingRef.current;

      if (activeTool === 'line' || activeTool === 'arrow') {
        (shape as Line).set({ x2: pointer.x, y2: pointer.y });
      } else if (activeTool === 'rect') {
        const w = Math.abs(pointer.x - startX);
        const h = Math.abs(pointer.y - startY);
        (shape as Rect).set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          width: w,
          height: h,
        });
      } else if (activeTool === 'circle') {
        const radius =
          Math.sqrt(Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)) / 2;
        (shape as Circle).set({
          left: (startX + pointer.x) / 2 - radius,
          top: (startY + pointer.y) / 2 - radius,
          radius,
        });
      }

      canvas.renderAll();
    },
    [activeTool],
  );

  const handleMouseUp = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !drawingRef.current.isDrawing) return;

    const { shape, startX, startY } = drawingRef.current;
    drawingRef.current.isDrawing = false;

    if (shape) {
      // If arrow, add arrowhead
      if (activeTool === 'arrow' && shape instanceof Line) {
        const line = shape;
        const x1 = line.x1 ?? startX;
        const y1 = line.y1 ?? startY;
        const x2 = line.x2 ?? startX;
        const y2 = line.y2 ?? startY;
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        const headSize = toolOptions.strokeWidth * 4;
        const head = new Triangle({
          width: headSize,
          height: headSize,
          fill: toolOptions.strokeColor,
          left: x2,
          top: y2,
          angle: angle + 90,
          originX: 'center',
          originY: 'center',
          opacity: toolOptions.opacity,
          selectable: false,
          evented: false,
        });

        canvas.remove(shape);
        const group = new Group([line, head], {
          opacity: toolOptions.opacity,
        });
        canvas.add(group);
      }

      // Make selectable after drawing
      shape.set({ selectable: true, evented: true });
      canvas.renderAll();
    }

    drawingRef.current.shape = null;
  }, [activeTool, toolOptions]);

  // Attach mouse event handlers
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.on('mouse:down', handleMouseDown as any);
    canvas.on('mouse:move', handleMouseMove as any);
    canvas.on('mouse:up', handleMouseUp as any);

    return () => {
      canvas.off('mouse:down', handleMouseDown as any);
      canvas.off('mouse:move', handleMouseMove as any);
      canvas.off('mouse:up', handleMouseUp as any);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center bg-gray-900 overflow-hidden"
    >
      <canvas ref={canvasElRef} />
    </div>
  );
}
