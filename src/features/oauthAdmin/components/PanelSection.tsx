import type { ReactNode } from 'react';

/** A titled block of a drawer body (DESIGN.md section 5: drawer body section heading). */
const PanelSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h3 className="border-b border-(--palette-line-soft) pb-1.5 text-sm font-semibold text-(--palette-ink)">
      {title}
    </h3>
    {children}
  </section>
);

export default PanelSection;
