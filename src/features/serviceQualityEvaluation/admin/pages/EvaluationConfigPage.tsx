import '@/features/serviceQualityEvaluation/admin/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import type { EvaluationConfig, GuidanceMap, ThresholdsMap } from '../../api/types';
import { RATING_VALUES } from '../../constants/guidelines';
import { useGetEvaluationConfig, useUpdateEvaluationConfig } from '../api/evaluationConfigAdmin';

// ─── Segment toggle ───────────────────────────────────────────────────────────

const SEGMENTS = ['Retail', 'IBG'] as const;
type Segment = (typeof SEGMENTS)[number];

// ─── Inline input classes ─────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

const textareaClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none';

// ─── Single criteria row editor ───────────────────────────────────────────────

interface CriteriaRowEditorProps {
  config: EvaluationConfig;
}

function CriteriaRowEditor({ config }: CriteriaRowEditorProps) {
  const { t } = useTranslation(['evaluationConfig', 'common']);
  const updateConfig = useUpdateEvaluationConfig();

  // Local draft state — mirrors the config fields the user can edit.
  const [labelEn, setLabelEn] = useState(config.labelEn);
  const [labelTh, setLabelTh] = useState(config.labelTh);
  const [weight, setWeight] = useState(String(config.weight));
  const [maxScore, setMaxScore] = useState(String(config.maxScore));

  // Guidance: per rating level (1..5), en + th text.
  const [guidance, setGuidance] = useState<GuidanceMap>(() => {
    // Ensure all 5 levels exist in draft.
    const base: GuidanceMap = {};
    for (const rv of RATING_VALUES) {
      const key = String(rv);
      base[key] = {
        en: config.guidance[key]?.en ?? '',
        th: config.guidance[key]?.th ?? '',
      };
    }
    return base;
  });

  // Thresholds (Delivery slot only).
  const isDelivery = config.criteriaSlot === 2;
  const [thresholds, setThresholds] = useState<ThresholdsMap>(() => {
    if (!isDelivery) return {};
    const base: ThresholdsMap = { '5': 2, '4': 2.5, '3': 3, '2': 3.5 };
    if (config.thresholds) {
      for (const [k, v] of Object.entries(config.thresholds)) {
        base[k] = v;
      }
    }
    return base;
  });

  const [expanded, setExpanded] = useState(false);

  const handleSave = () => {
    const parsedWeight = parseFloat(weight);
    const parsedMaxScore = parseInt(maxScore, 10);

    if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 1) {
      toast.error(t('evaluationConfig:errors.invalidWeight'));
      return;
    }
    if (isNaN(parsedMaxScore) || parsedMaxScore < 1) {
      toast.error(t('evaluationConfig:errors.invalidMaxScore'));
      return;
    }

    updateConfig.mutate(
      {
        id: config.id,
        body: {
          labelEn,
          labelTh,
          weight: parsedWeight,
          maxScore: parsedMaxScore,
          guidanceJson: JSON.stringify(guidance),
          thresholdsJson: isDelivery ? JSON.stringify(thresholds) : null,
        },
      },
      {
        onSuccess: () => toast.success(t('evaluationConfig:toasts.saved')),
        onError: () => toast.error(t('evaluationConfig:toasts.saveFailed')),
      },
    );
  };

  const updateGuidance = (level: string, lang: 'en' | 'th', value: string) => {
    setGuidance(prev => ({
      ...prev,
      [level]: { ...prev[level], [lang]: value },
    }));
  };

  const updateThreshold = (rating: string, value: string) => {
    const parsed = parseFloat(value);
    setThresholds(prev => ({ ...prev, [rating]: isNaN(parsed) ? 0 : parsed }));
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
          {config.criteriaSlot}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-800">
          {labelEn || config.labelEn}
          {labelTh && <span className="ml-2 text-gray-400 font-normal">{labelTh}</span>}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} style="solid" className="size-3.5" />
        </button>
      </div>

      {/* Editor body */}
      {expanded && (
        <div className="px-4 py-4 space-y-4 bg-white">
          {/* Labels */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('evaluationConfig:fields.labelEn')}
              </label>
              <input
                type="text"
                value={labelEn}
                onChange={e => setLabelEn(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('evaluationConfig:fields.labelTh')}
              </label>
              <input
                type="text"
                value={labelTh}
                onChange={e => setLabelTh(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Weight + MaxScore */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('evaluationConfig:fields.weight')}
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('evaluationConfig:fields.maxScore')}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxScore}
                onChange={e => setMaxScore(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Delivery thresholds */}
          {isDelivery && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                {t('evaluationConfig:fields.deliveryThresholds')}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {(['5', '4', '3', '2'] as const).map(r => (
                  <div key={r}>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t('evaluationConfig:fields.thresholdRating', { rating: r })}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={thresholds[r] ?? ''}
                      onChange={e => updateThreshold(r, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {t('evaluationConfig:fields.thresholdHint')}
              </p>
            </div>
          )}

          {/* Guidance per rating level */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              {t('evaluationConfig:fields.guidance')}
            </p>
            <div className="space-y-3">
              {RATING_VALUES.map(rv => (
                <div key={rv} className="border border-gray-100 rounded-md p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500">
                    {t('evaluationConfig:fields.ratingLevel', { level: rv })}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">EN</label>
                      <textarea
                        rows={2}
                        value={guidance[String(rv)]?.en ?? ''}
                        onChange={e => updateGuidance(String(rv), 'en', e.target.value)}
                        className={textareaClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">TH</label>
                      <textarea
                        rows={2}
                        value={guidance[String(rv)]?.th ?? ''}
                        onChange={e => updateGuidance(String(rv), 'th', e.target.value)}
                        className={textareaClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              type="button"
              onClick={handleSave}
              isLoading={updateConfig.isPending}
            >
              {t('common:actions.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function EvaluationConfigPage() {
  const { t } = useTranslation(['evaluationConfig', 'common']);
  const [segment, setSegment] = useState<Segment>('Retail');

  const { data: configs, isLoading } = useGetEvaluationConfig(segment);

  // Weights sum hint.
  const weightsSum = configs ? configs.reduce((sum, c) => sum + c.weight, 0) : null;
  const weightsSumOk = weightsSum != null && Math.abs(weightsSum - 1.0) < 0.001;

  const sortedConfigs = configs
    ? [...configs].sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          {t('evaluationConfig:page.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('evaluationConfig:page.subtitle')}
        </p>
      </div>

      {/* Segment toggle */}
      <div className="flex gap-2">
        {SEGMENTS.map(seg => (
          <button
            key={seg}
            type="button"
            onClick={() => setSegment(seg)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              segment === seg
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      {/* Weights sum indicator */}
      {weightsSum != null && (
        <div
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md w-fit ${
            weightsSumOk
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          <Icon
            name={weightsSumOk ? 'check' : 'triangle-exclamation'}
            style="solid"
            className="size-3.5"
          />
          {t('evaluationConfig:weightsSum', { sum: weightsSum.toFixed(2) })}
          {!weightsSumOk && (
            <span className="ml-1 font-medium">
              {t('evaluationConfig:weightsSumWarning')}
            </span>
          )}
        </div>
      )}

      {/* Config list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : sortedConfigs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-400 italic">
          {t('evaluationConfig:noConfigs')}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedConfigs.map(cfg => (
            <CriteriaRowEditor key={cfg.id} config={cfg} />
          ))}
        </div>
      )}
    </div>
  );
}

export default EvaluationConfigPage;
