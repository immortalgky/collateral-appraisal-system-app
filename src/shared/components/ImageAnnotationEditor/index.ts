import { lazy } from 'react';

export type { AnnotationResult, ImageAnnotationEditorProps } from './types';

const ImageAnnotationEditor = lazy(() => import('./ImageAnnotationEditor'));

export default ImageAnnotationEditor;
