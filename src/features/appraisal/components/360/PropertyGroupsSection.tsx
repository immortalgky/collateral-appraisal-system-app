import Icon from '@/shared/components/Icon';
import type { PropertyGroup, PropertyType } from '../../types';
import PropertyGroupCard from './PropertyGroupCard';

interface PropertyGroupsSectionProps {
  groups: PropertyGroup[];
  isLoading: boolean;
  onPropertyClick: (propertyId: string, propertyType: PropertyType, groupName: string) => void;
}

const PropertyGroupsSection = ({
  groups,
  isLoading,
  onPropertyClick,
}: PropertyGroupsSectionProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Icon name="buildings" style="regular" className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No property groups found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Icon name="buildings" style="solid" className="w-4 h-4 text-purple-500" />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Property Groups ({groups.length})
        </h2>
      </div>
      {groups.map(group => (
        <PropertyGroupCard
          key={group.id}
          group={group}
          onPropertyClick={onPropertyClick}
        />
      ))}
    </div>
  );
};

export default PropertyGroupsSection;
