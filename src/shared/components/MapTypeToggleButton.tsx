import { useState } from 'react';
import Icon from './Icon';
import { MAP_CONTROL_CLASS } from '@/shared/constants/mapConfig';

// Minimal structural typing — the app's google shim doesn't model the map.
type MapTypeControllable = {
  getMapTypeId: () => string | undefined;
  setMapTypeId: (id: string) => void;
};

interface MapTypeToggleButtonProps {
  /** The Google map instance to control. */
  map: MapTypeControllable;
  /** Extra classes (sizing/position) appended to the dark control style. */
  className?: string;
}

/**
 * React-rendered "satellite ⇄ map" toggle, styled to match the other floating
 * map controls (dark + translucent for legibility over satellite imagery). The
 * icon reflects the action: a map icon while in satellite, a globe while in map.
 *
 * Use this when the toggle needs to live alongside other React overlay buttons
 * (e.g. next to the "my location" button). For maps without such buttons, the
 * DOM-based addMapTypeToggle (pushed into map.controls) is simpler.
 */
export function MapTypeToggleButton({ map, className = '' }: MapTypeToggleButtonProps) {
  const [isSatellite, setIsSatellite] = useState(() => map.getMapTypeId() !== 'roadmap');

  const toggle = () => {
    const next = isSatellite ? 'roadmap' : 'satellite';
    map.setMapTypeId(next);
    setIsSatellite(next === 'satellite');
  };

  const label = isSatellite ? 'Switch to map view' : 'Switch to satellite view';

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={`flex items-center justify-center rounded-md ${MAP_CONTROL_CLASS} ${className}`}
    >
      <Icon name={isSatellite ? 'map' : 'earth-asia'} style="solid" className="size-4" />
    </button>
  );
}
