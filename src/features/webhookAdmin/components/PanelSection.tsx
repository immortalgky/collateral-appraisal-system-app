import type { ReactNode } from 'react';

/** A titled block of a drawer body (DESIGN.md section 5: drawer body section heading). */
const PanelSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2.5">
    <h3 className="border-b border-gray-100 pb-1.5 text-sm font-semibold text-gray-800">{title}</h3>
    {children}
  </section>
);

export default PanelSection;
