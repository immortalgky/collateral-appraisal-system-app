import type { TFunction } from 'i18next';

interface UnitParts {
  roomNumber?: string;
  floor?: number;
  towerName?: string;
  houseNumber?: string;
  plotNumber?: string;
}

/** "Room 129/318 · Floor 7 · Tower B" or "House 102 · Plot P-002" — the parts the unit has. */
export function unitLabel(u: UnitParts, t: TFunction<'reappraisal'>): string {
  return [
    u.roomNumber && t('unit.room', { value: u.roomNumber }),
    u.floor != null && t('unit.floor', { value: u.floor }),
    u.towerName && t('unit.tower', { value: u.towerName }),
    u.houseNumber && t('unit.house', { value: u.houseNumber }),
    u.plotNumber && t('unit.plot', { value: u.plotNumber }),
  ]
    .filter(Boolean)
    .join(' · ');
}
