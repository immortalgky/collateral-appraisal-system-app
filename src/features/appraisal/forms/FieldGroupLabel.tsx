interface FieldGroupLabelProps {
  label: string;
}

/**
 * Sub-heading for grouping a cluster of fields (e.g. "Address" vs
 * "Dopa Address") within a single SectionRow, without the icon/title chrome
 * of a full SectionRow.
 */
const FieldGroupLabel = ({ label }: FieldGroupLabelProps) => (
  <div className="col-span-12 flex items-center gap-2 mt-1 mb-1">
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
  </div>
);

export default FieldGroupLabel;
