import ProjectLandForm from '../../forms/ProjectLandForm';

/**
 * LandAndBuilding-only tab that wraps ProjectLandForm.
 * ProjectLandForm owns its own RHF setup, API calls, and ActionBar.
 */
export default function ProjectLandTab() {
  return <ProjectLandForm />;
}
