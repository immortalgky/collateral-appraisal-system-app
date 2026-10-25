import type { ProjectType } from '../../types';
import CondoModelListing from '../condo/towersModels/CondoModelListing';

interface ModelListingTabProps {
  projectType: ProjectType;
}

/**
 * The model list is one table for Condo and Land and Building (CondoModelListing). Land and
 * Building (Construction) (L) is appraised as land only and has no models: its units are plots, so
 * there is nothing to list.
 */
export default function ModelListingTab({ projectType }: ModelListingTabProps) {
  if (projectType === 'L') return null;
  return <CondoModelListing projectType={projectType} />;
}
