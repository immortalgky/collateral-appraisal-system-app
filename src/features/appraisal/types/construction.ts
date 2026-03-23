export interface ConstructionSubItem {
  id?: string | null;
  constructionWorkGroupId: string;
  constructionWorkItemId?: string | null;
  workItemName: string;
  displayOrder?: number | null;
  proportionPct: number;
  previousProgressPct: number;
  currentProgressPct: number;
}

export interface ComputedSubItem extends ConstructionSubItem {
  _index: number;
  constructionValue: number;
  currentProportionPct: number;
  previousPropertyValue: number;
  currentPropertyValue: number;
}

export interface CategorySubtotal {
  constructionWorkGroupId: string;
  totalConstructionValue: number;
  totalProportion: number;
  averagePreviousProgress: number;
  averageCurrentProgress: number;
  totalPreviousPropertyValue: number;
  totalCurrentPropertyValue: number;
}

export interface ConstructionAttachment {
  id: string;
  fileName: string;
  file?: File;
}
