import { Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';

export const PROPERTY_TYPES = [
  {
    type: 'Building',
    icon: 'building',
    route: 'building',
    description: 'Standalone building structure',
  },
  {
    type: 'Condominium',
    icon: 'city',
    route: 'condo',
    description: 'Condominium unit',
  },
  {
    type: 'Land and building',
    icon: 'house-chimney',
    route: 'land-building',
    description: 'Land with building structure',
  },
  {
    type: 'Lands',
    icon: 'map-location-dot',
    route: 'land',
    description: 'Land parcel only',
  },
  {
    type: 'Lease Agreement Building',
    icon: 'file-contract',
    route: 'building',
    description: 'Leased building property',
  },
  {
    type: 'Lease Agreement Land and building',
    icon: 'file-signature',
    route: 'land-building',
    description: 'Leased land with building',
  },
  {
    type: 'Lease Agreement Lands',
    icon: 'scroll',
    route: 'land',
    description: 'Leased land parcel',
  },
  {
    type: 'Machine',
    icon: 'gears',
    route: null,
    description: 'Machinery and equipment',
  },
  {
    type: 'Vehicle',
    icon: 'car',
    route: null,
    description: 'Vehicle asset',
  },
  {
    type: 'Vessel',
    icon: 'ship',
    route: null,
    description: 'Marine vessel',
  },
] as const;

interface PropertyTypeDropdownProps {
  groupId: string;
  onSelectType?: (type: string, groupId: string) => void;
  buttonClassName?: string;
  align?: 'left' | 'right';
}

export const PropertyTypeDropdown = ({
  groupId,
  onSelectType,
  buttonClassName,
  align = 'left',
}: PropertyTypeDropdownProps) => {
  const navigate = useNavigate();
  const { appraisalId } = useParams<{ appraisalId: string }>();

  const handleSelect = (propertyType: (typeof PROPERTY_TYPES)[number]) => {
    if (onSelectType) {
      onSelectType(propertyType.type, groupId);
    }

    if (propertyType.route) {
      // Navigate to the create page under appraisal context
      const basePath = appraisalId
        ? `/appraisal/${appraisalId}/property/${propertyType.route}/new`
        : `/${propertyType.route}-detail`;

      navigate(`${basePath}?groupId=${groupId}&type=${encodeURIComponent(propertyType.type)}`);
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        className={clsx(
          'flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors',
          buttonClassName,
        )}
      >
        <Icon name="circle-plus" className="text-gray-500" />
        <span>Add property to group</span>
        <Icon name="chevron-down" className="text-gray-400 ml-1" style="solid" />
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          className={clsx(
            'absolute z-50 mt-2 w-72 origin-top rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="py-2 max-h-[400px] overflow-y-auto">
            {PROPERTY_TYPES.map(propertyType => (
              <MenuItem key={propertyType.type}>
                {({ focus }) => (
                  <button
                    type="button"
                    onClick={() => handleSelect(propertyType)}
                    disabled={!propertyType.route}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      focus && propertyType.route ? 'bg-gray-50' : '',
                      !propertyType.route ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        propertyType.route ? 'bg-primary/10' : 'bg-gray-100',
                      )}
                    >
                      <Icon
                        name={propertyType.icon}
                        className={clsx(
                          'text-sm',
                          propertyType.route ? 'text-primary' : 'text-gray-400',
                        )}
                        style="solid"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={clsx(
                          'text-sm font-medium',
                          propertyType.route ? 'text-gray-900' : 'text-gray-500',
                        )}
                      >
                        {propertyType.type}
                      </p>
                      {!propertyType.route && <p className="text-xs text-gray-400">Coming soon</p>}
                    </div>
                    {propertyType.route && (
                      <Icon name="chevron-right" className="text-gray-300" style="solid" />
                    )}
                  </button>
                )}
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
};

export default PropertyTypeDropdown;
