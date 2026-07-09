import { lazyWithRetry } from '@shared/utils/lazyWithRetry';

export type { AnnotationResult, ImageAnnotationEditorProps } from './types';

const ImageAnnotationEditor = lazyWithRetry(() => import('./ImageAnnotationEditor'));

export default ImageAnnotationEditor;
