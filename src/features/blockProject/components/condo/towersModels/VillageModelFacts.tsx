import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/shared/utils/formatUtils';

import type { ProjectModel } from '../../../types';
import { useTowerModelFigures } from './useTowerModelFigures';

/**
 * "Used by N houses (S sold) · standard price ฿X / house" for a village model, from the unit list
 * the page already has cached. A model is priced per house, not per sq.m. like a Condo's.
 */
export function VillageModelFacts({ model }: { model: ProjectModel }) {
  const { t } = useTranslation('blockProject');
  const { hasUnits, unitsOfModel } = useTowerModelFigures();
  const units = unitsOfModel(model);
  const facts = [
    hasUnits &&
      t(units.sold > 0 ? 'lbLists.modelDetail.usedBySold' : 'lbLists.modelDetail.usedBy', {
        n: formatNumber(units.total),
        sold: formatNumber(units.sold),
      }),
    model.finalAppraisedValue == null
      ? t('condoTowersModels.models.pending')
      : t('lbLists.modelDetail.standardPrice', {
          price: formatNumber(model.finalAppraisedValue, 2),
        }),
  ].filter(Boolean);

  return <>{facts.join(' · ')}</>;
}
