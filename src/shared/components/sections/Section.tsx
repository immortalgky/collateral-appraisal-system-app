import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface SectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  anchor?: boolean;
}

const Section = ({ children, anchor, className, ...props }: SectionProps) => {
  return (
    <section className={clsx(anchor === true && 'nav-anchor', className)} {...props}>
      {children}
    </section>
  );
};

export default Section;
