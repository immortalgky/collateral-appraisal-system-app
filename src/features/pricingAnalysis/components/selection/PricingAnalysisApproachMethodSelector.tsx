import { Icon, Toggle } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { Textarea } from '@/shared/components/inputs';
import { PricingAnalysisApproachAccordion } from './PricingAnalysisApproachAccordion';
import type { ViewLayout } from './PricingAnalysisMethodCard';
import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import type { PricingAnalysisConfigType } from '../../schemas';
import { useState, useCallback, useRef } from 'react';

const VIEW_LAYOUT_KEY = 'pricing-analysis-view-layout';

function getStoredLayout(): ViewLayout {
  try {
    const stored = localStorage.getItem(VIEW_LAYOUT_KEY);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch { /* ignore */ }
  return 'grid';
}

interface DeleteConfirmState {
  isOpen: boolean;
  hasData: boolean;
  isDeleting: boolean;
  confirmDelete: () => void;
  cancelDelete: () => void;
}

interface PricingAnalysisApproachMethodSelectorProps {
  state: SelectionState;
  isSystemCalculation: string;
  onSystemCalculationChange: (check: boolean) => void;
  onEnterEdit: () => void;
  onEditModeSave: () => void;
  onCancelEditMode: () => void;
  onSummaryModeSave: () => void;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  pricingConfiguration?: PricingAnalysisConfigType[];
  deleteConfirm?: DeleteConfirmState;
  onManualValueChange?: (arg: { approachType: string; methodType: string; value: number }) => void;
}

export const PricingAnalysisApproachMethodSelector = ({
  state,
  isSystemCalculation,
  onSystemCalculationChange,
  onEnterEdit,
  onCancelEditMode,
  onToggleMethod,
  onSelectCalculationMethod,

  onSelectCandidateMethod,
  onSelectCandidateApproach,

  onAddMethod,
  onDeleteMethod,
  pricingConfiguration,
  deleteConfirm,
  onManualValueChange,
}: PricingAnalysisApproachMethodSelectorProps) => {
  const [viewLayout, setViewLayout] = useState<ViewLayout>(getStoredLayout);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [remark, setRemark] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleViewLayoutChange = useCallback((layout: ViewLayout) => {
    setViewLayout(layout);
    try { localStorage.setItem(VIEW_LAYOUT_KEY, layout); } catch { /* ignore */ }
  }, []);

  // Build a lookup of config methods per approach type
  const configMethodsByApproach = new Map(
    (pricingConfiguration ?? []).map(conf => [conf.approachType, conf.methods]),
  );

  const isEditing = state.viewMode === 'editing';

  const isManualMode = isSystemCalculation !== 'System';

  return (
    <div className="flex flex-col overflow-hidden gap-4 h-full">
      {/* Calculation Mode Banner */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Icon name={isManualMode ? 'pen-field' : 'microchip'} style="solid" className="size-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isManualMode ? 'Manual Entry' : 'System Calculation'}
            </p>
            <p className="text-xs text-gray-400">
              {isManualMode
                ? 'Enter appraisal values directly for each method'
                : 'System auto-calculates appraisal values'}
            </p>
          </div>
        </div>
        <Toggle
          size="sm"
          options={['Manual', 'System']}
          checked={isSystemCalculation === 'System'}
          onChange={onSystemCalculationChange}
        />
      </div>

      {/* Section header with Edit button — shared by both modes */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">
          {isEditing ? 'Editing Approaches & Methods' : 'Approaches & Methods'}
        </span>
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${
            isEditing
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'text-primary border border-primary/30 hover:bg-primary/5'
          }`}
          onClick={() => {
            if (isEditing) {
              onCancelEditMode();
            } else {
              onEnterEdit();
            }
          }}
        >
          <Icon
            name={isEditing ? 'check' : 'pen-to-square'}
            style={isEditing ? 'solid' : 'regular'}
            className="size-3.5"
          />
          {isEditing ? 'Done' : 'Edit Approaches'}
        </button>
      </div>

      {/* Inline edit view — shared by both modes */}
      {isEditing && (
        <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          {state.editDraft?.map(appr => (
            <PricingAnalysisApproachAccordion
              key={appr.id}
              viewMode={state.viewMode}
              approach={appr}
              onToggleMethod={onToggleMethod}
              onSelectCalculationMethod={onSelectCalculationMethod}
              onSelectCandidateApproach={onSelectCandidateApproach}
              onSelectCandidateMethod={onSelectCandidateMethod}
              onAddMethod={onAddMethod}
              onDeleteMethod={onDeleteMethod}
              configMethods={configMethodsByApproach.get(appr.approachType)}
            />
          ))}

          {/* Delete confirmation */}
          {deleteConfirm && (
            <ConfirmDialog
              isOpen={deleteConfirm.isOpen}
              onClose={deleteConfirm.cancelDelete}
              onConfirm={deleteConfirm.confirmDelete}
              title="Delete Method"
              message={
                deleteConfirm.hasData
                  ? 'This method has calculated data. Deleting will permanently remove all results.'
                  : 'Are you sure you want to delete this method?'
              }
              confirmText="Delete"
              variant={deleteConfirm.hasData ? 'danger' : 'warning'}
              isLoading={deleteConfirm.isDeleting}
            />
          )}
        </div>
      )}

      {/* Summary view */}
      {!isEditing && (
        <div className="flex flex-col w-full h-full min-h-0 gap-4">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
            {state.summarySelected?.map(appr => (
              <PricingAnalysisApproachAccordion
                key={appr.id}
                viewMode="summary"
                viewLayout={viewLayout}
                approach={{
                  ...appr,
                  methods: appr.methods.filter(method => method.isIncluded),
                }}
                onToggleMethod={onToggleMethod}
                onSelectCalculationMethod={onSelectCalculationMethod}
                onSelectCandidateApproach={onSelectCandidateApproach}
                onSelectCandidateMethod={onSelectCandidateMethod}
                onViewLayoutChange={handleViewLayoutChange}
                isManualMode={isManualMode}
                onManualValueChange={isManualMode ? onManualValueChange : undefined}
              />
            ))}
          </div>

          {/* Manual mode: PDF uploader & Remark */}
          {isManualMode && (
            <div className="flex flex-col gap-4">
              {/* PDF File Uploader */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-600">Upload PDF</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setPdfFiles(prev => [...prev, file]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-sm text-gray-500 hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="file-pdf" style="regular" className="size-4" />
                  Click to upload PDF
                </button>
                {pdfFiles.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {pdfFiles.map((file, idx) => (
                      <li
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 text-gray-700 truncate hover:text-primary cursor-pointer"
                          onClick={() => {
                            const url = URL.createObjectURL(file);
                            window.open(url, '_blank');
                          }}
                          title="Open PDF"
                        >
                          <Icon name="file-pdf" style="solid" className="size-4 text-red-500 shrink-0" />
                          <span className="truncate underline underline-offset-2">{file.name}</span>
                        </button>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 cursor-pointer"
                          onClick={() => setPdfFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Icon name="xmark" style="solid" className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Remark Textarea */}
              <Textarea
                label="Remark"
                rows={3}
                placeholder="Add any remarks or notes for this manual appraisal..."
                value={remark}
                onChange={e => setRemark(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
