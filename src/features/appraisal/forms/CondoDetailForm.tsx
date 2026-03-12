import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import type { ReactNode } from 'react';
import CondoAreaDetailForm from './CondoAreaDetailForm';
import {
  condoFields,
  condoLocationFields,
  condoDecorationFields,
  ageHeightCondoFields,
  buildingFormFields,
  constructionMaterialsFormFields,
  condoRoomLayoutFormFields,
  locationViewFormFields,
  groundFloorFields,
  upperFloorFields,
  bathroomFloorFields,
  roofFormFields,
  expropriationFields,
  condoFacilityFields,
  environmentFields,
  inForestBoundaryFormFields,
  remarkFormFields,
} from '../configs/fields';

// SectionRow component for consistent section styling with icons
interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-5" />}
  </>
);

const Card = ({ children }: { children: ReactNode }) => (
  <div className="col-span-12 bg-gray-50 rounded-lg p-3">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

function CondoDetailForm() {
  return (
    <div className="grid grid-cols-5 gap-6">
      <SectionRow title="Condominium Information" icon="building">
        <FormFields fields={condoFields} />
      </SectionRow>

      <SectionRow title="Condominium Location" icon="map-location-dot">
        <FormFields fields={condoLocationFields} />
      </SectionRow>

      <SectionRow title="Decoration & Structure" icon="paint-roller">
        <Card>
          <FormFields fields={condoDecorationFields} />
        </Card>
        <Card>
          <FormFields fields={ageHeightCondoFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Building Design" icon="building-columns">
        <Card>
          <FormFields fields={buildingFormFields} />
        </Card>
        <Card>
          <FormFields fields={constructionMaterialsFormFields} />
        </Card>
        <Card>
          <FormFields fields={condoRoomLayoutFormFields} />
        </Card>
        <Card>
          <FormFields fields={locationViewFormFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Floor" icon="layer-group">
        <Card>
          <FormFields fields={groundFloorFields} />
        </Card>
        <Card>
          <FormFields fields={upperFloorFields} />
        </Card>
        <Card>
          <FormFields fields={bathroomFloorFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Roof" icon="tent">
        <FormFields fields={roofFormFields} />
      </SectionRow>

      <SectionRow title="Area Details" icon="chart-area">
        <div className="col-span-12">
          <CondoAreaDetailForm name={'areaDetails'} />
        </div>
      </SectionRow>

      <SectionRow title="Expropriation" icon="file-invoice">
        <Card>
          <FormFields fields={expropriationFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Facilities & Environment" icon="dumbbell">
        <Card>
          <FormFields fields={condoFacilityFields} />
        </Card>
        <Card>
          <FormFields fields={environmentFields} />
        </Card>
      </SectionRow>

      <SectionRow title="In Forest Boundary" icon="tree-city">
        <FormFields fields={inForestBoundaryFormFields} />
      </SectionRow>

      <SectionRow title="Remarks" icon="comment" isLast>
        <FormFields fields={remarkFormFields} />
      </SectionRow>
    </div>
  );
}

export default CondoDetailForm;
