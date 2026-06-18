import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Icon from '@shared/components/Icon';
import { MapView } from '@/features/common/historySearch/components/MapView';
import type {
  AppraisalPinDto,
  MarketComparablePinDto,
  PinFilterState,
} from '@/features/common/historySearch/types';
import { isWithinThailand } from '@/shared/constants/mapConfig';
import { useGetAppraisalMapPins } from '../api/marketComparable';
import type { PropertyItem } from '../types';

interface PropertiesMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appraisal id — used to fetch the appraisal's market comparables. */
  appraisalId: string | undefined;
  /** All properties of the appraisal (across every group). */
  properties: PropertyItem[];
  /** Id of the property whose pin was clicked — highlighted in a distinct colour. */
  selectedPropertyId: string;
}

/**
 * A property is mappable only when it has real coordinates inside Thailand.
 * Using the country-bounds check (not just a 0,0 guard) also drops partial
 * coordinates — e.g. latitude set but longitude 0 — which would otherwise drag
 * `fitBounds` out to a whole-country view.
 */
function hasCoords(p: PropertyItem): boolean {
  return p.latitude != null && p.longitude != null && isWithinThailand(p.latitude, p.longitude);
}

// Appraising-collateral layer (the appraisal's own properties) + market comparables.
const PIN_FILTERS: PinFilterState = {
  showCollateral: false,
  showMarketComparables: true,
  showCollateralAppraising: true,
  showMcAppraising: false,
  showSupportingData: false,
};

const noop = () => {};

/**
 * Shows every property of the current appraisal on the built-in Google map.
 * The clicked property is emphasised (purple "main" pin) while the rest render
 * as orange appraising pins. Reuses `MapView` — no bespoke map logic here.
 */
export function PropertiesMapModal({
  isOpen,
  onClose,
  appraisalId,
  properties,
  selectedPropertyId,
}: PropertiesMapModalProps) {
  const { t } = useTranslation('appraisal');

  // Market comparables for the whole appraisal — fetched only while the modal is open.
  const { data: mapPins } = useGetAppraisalMapPins(appraisalId, { enabled: isOpen });

  const mcPins = useMemo<MarketComparablePinDto[]>(
    () =>
      (mapPins?.marketComparables ?? [])
        .filter(mc => isWithinThailand(mc.lat, mc.lon))
        .map(mc => ({
        marketComparableId: mc.marketComparableId,
        lat: mc.lat,
        lon: mc.lon,
        propertyType: mc.propertyType,
        surveyName: mc.surveyName,
        infoDateTime: mc.infoDateTime,
        offerPrice: mc.offerPrice,
        salePrice: mc.salePrice,
        distanceKm: null,
        appraisalNumber: null,
        customerName: null,
        appraisalDate: null,
      })),
    [mapPins],
  );

  // Map each located property → the AppraisalPinDto shape MapView consumes.
  // `appraisalNumber` carries the property id so `primaryAppraisalNumber` can
  // single out the clicked one as the emphasised "main" pin.
  const pins = useMemo<AppraisalPinDto[]>(
    () =>
      properties.filter(hasCoords).map(p => ({
        appraisalId: p.id,
        appraisalNumber: p.id,
        lat: p.latitude as number,
        lon: p.longitude as number,
        propertyType: p.type,
        buildingType: null,
        appraisedValue: null,
        appraisedDate: null,
        distanceKm: null,
        province: null,
        district: null,
        subDistrict: null,
        customerName: p.address,
      })),
    [properties],
  );

  const center = useMemo(() => {
    const selected = pins.find(p => p.appraisalNumber === selectedPropertyId) ?? pins[0] ?? mcPins[0];
    return selected ? { lat: selected.lat, lon: selected.lon } : null;
  }, [pins, mcPins, selectedPropertyId]);

  // Hover tooltip shows the property name (stashed in customerName), not the id.
  const collateralTitle = useCallback((pin: AppraisalPinDto) => pin.customerName ?? '', []);

  // Bump on open / selection change / when comparables arrive so MapView reframes all pins.
  const [fitToken, setFitToken] = useState(0);
  useEffect(() => {
    if (isOpen) setFitToken(t => t + 1);
  }, [isOpen, selectedPropertyId, mcPins.length]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('properties.map.title')} size="3xl">
      {pins.length === 0 && mcPins.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-gray-400">
          <Icon name="location-dot" className="text-4xl mb-3" style="solid" />
          <p className="text-sm font-medium text-gray-500">{t('properties.map.empty')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('properties.map.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="h-[70vh] w-full rounded-lg overflow-hidden">
            <MapView
              center={center}
              appraisalPins={[]}
              marketComparablePins={mcPins}
              appraisingCollateralPins={pins}
              primaryAppraisalNumber={selectedPropertyId}
              appraisingCollateralTitle={collateralTitle}
              centerOnPrimary
              pinFilters={PIN_FILTERS}
              cluster={false}
              fitToken={fitToken}
              onMapClick={noop}
              onAppraisalPinClick={noop}
              onMarketComparablePinClick={noop}
            />
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <img src="/markers/collateral-main.svg" alt="" className="h-4 w-auto" />
              {t('properties.map.legendSelected')}
            </span>
            <span className="flex items-center gap-1.5">
              <img src="/markers/collateral-appraising.svg" alt="" className="h-4 w-auto" />
              {t('properties.map.legendOthers')}
            </span>
            <span className="flex items-center gap-1.5">
              <img src="/markers/mc-existing.svg" alt="" className="h-4 w-auto" />
              {t('properties.map.legendComparables')}
            </span>
          </div>
        </>
      )}
    </Modal>
  );
}

export default PropertiesMapModal;
