// Document Checklist Types for Appraisal Module
import { schemas } from '@shared/schemas/v1';
import type { z } from 'zod';

// ==================== V1 Schema Types ====================

// Request Documents
export type DocumentItemDto = z.infer<typeof schemas.DocumentItemDto>;
export type DocumentSectionDto = z.infer<typeof schemas.DocumentSectionDto>;
export type GetRequestDocumentsByRequestIdResponse = z.infer<
  typeof schemas.GetRequestDocumentsByRequestIdResponse
>;

// Appendix Documents
export type AppendixDocumentDto = z.infer<typeof schemas.AppendixDocumentDto>;
export type AppraisalAppendixDto = z.infer<typeof schemas.AppraisalAppendixDto>;
export type GetAppraisalAppendicesResponse = z.infer<typeof schemas.GetAppraisalAppendicesResponse>;

// Appendix Mutations
export type AddAppendixDocumentRequest = z.infer<typeof schemas.AddAppendixDocumentRequest>;
export type AddAppendixDocumentResult = z.infer<typeof schemas.AddAppendixDocumentResult>;
export type RemoveAppendixDocumentResult = z.infer<typeof schemas.RemoveAppendixDocumentResult>;
export type UpdateAppendixLayoutResult = z.infer<typeof schemas.UpdateAppendixLayoutResult>;

// ==================== UI Constants ====================

// Appendix Document Types from Figma design (still useful for UI labels)
export const APPENDIX_DOCUMENT_TYPES = [
  'BRIEF_MAP',
  'DETAILED_MAP',
  'EARTH_MAP',
  'LAND_MAP',
  'CITY_PLAN',
  'STATUTORY_PLAN',
  'LAND_PLAN',
  'BUILDING_LAYOUT',
  'BLUEPRINT',
  'PHOTO_AND_PHOTO_SPOT',
  'REGISTRATION_INDEX',
  'RAWANG',
  'SUPPORTING_DOCUMENT',
] as const;

export type AppendixDocumentType = (typeof APPENDIX_DOCUMENT_TYPES)[number];

// Display names for document types
export const APPENDIX_DOCUMENT_TYPE_LABELS: Record<AppendixDocumentType, string> = {
  BRIEF_MAP: 'Brief Map',
  DETAILED_MAP: 'Detailed Map',
  EARTH_MAP: 'Earth Map',
  LAND_MAP: 'Land Map',
  CITY_PLAN: 'City Plan',
  STATUTORY_PLAN: 'Statutory Plan',
  LAND_PLAN: 'Land Plan',
  BUILDING_LAYOUT: 'Building Layout',
  BLUEPRINT: 'Blueprint',
  PHOTO_AND_PHOTO_SPOT: 'Photo and Photo spot',
  REGISTRATION_INDEX: 'Registration Index',
  RAWANG: 'Rawang',
  SUPPORTING_DOCUMENT: 'Supporting Document',
};

// Layout options for appendix
export const APPENDIX_LAYOUT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
];
