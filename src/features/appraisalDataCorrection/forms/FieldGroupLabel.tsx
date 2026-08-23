interface FieldGroupLabelProps {
  label: string;
}

/**
 * Sub-heading for grouping a cluster of fields (e.g. "Address" vs
 * "Dopa Address") within a single SectionRow, without the icon/title chrome
 * of a full SectionRow.
 *
 * `cas-group-label` lets the grid layout turn it into a full-width band; the
 * classic layout ignores the class entirely. The heading is what makes the
 * un-prefixed labels underneath readable — a field is "Sub District" because the
 * band above it already says DOPA ADDRESS.
 */
const FieldGroupLabel = ({ label }: FieldGroupLabelProps) => (
  <div className="cas-group-label col-span-12 flex items-center gap-2 mt-1 mb-1">
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
  </div>
);

export default FieldGroupLabel;
