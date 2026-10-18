import type { ReactNode } from 'react';
import clsx from 'clsx';
import Skeleton from '@/shared/components/Skeleton';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

/**
 * What the Request page shows while a saved request loads: the same blocks in the same places as
 * the page (header strip, section nav, the five cards, action bar), so nothing jumps when the data
 * arrives. Widths and gutters copy RequestPage, RequestHeaderStrip and RequestSectionNav; the
 * right-hand panel the page used to have is gone, so there is none here either.
 */

const Bar = ({ className }: { className?: string }) => (
  <Skeleton variant="rounded" className={className} />
);

/** A label over a control, on the 12-column field grid. */
const Field = ({ span, tall, hint }: { span: string; tall?: boolean; hint?: boolean }) => (
  <div className={clsx('flex flex-col gap-1.5', span)}>
    <Bar className="h-3 w-24" />
    <Bar className={tall ? 'h-28' : 'h-10'} />
    {hint && <Bar className="h-3 w-40" />}
  </div>
);

/** An in-card sub-section heading (text-sm semibold, a rule under it). */
const SubHeading = () => (
  <div className="flex flex-col gap-2 border-b border-gray-100 pb-2">
    <Bar className="h-4 w-32" />
  </div>
);

const TableBlock = ({ rows }: { rows: number }) => (
  <div className="flex flex-col gap-2">
    <Bar className="h-7 w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <Bar key={i} className="h-10 w-full" />
    ))}
  </div>
);

/** Card with the same header band as FormCard / SectionHeader variant="card". */
const CardShell = ({
  children,
  right,
  noBody,
}: {
  children?: ReactNode;
  right?: ReactNode;
  noBody?: boolean;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <Bar className="size-9 shrink-0 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <Bar className="h-4 w-44" />
          <Bar className="h-3 w-56" />
        </div>
      </div>
      {right}
    </div>
    {!noBody && <div className="flex flex-col gap-6 p-5">{children}</div>}
  </div>
);

const RequestPageSkeleton = () => {
  const readOnly = usePageReadOnly();

  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 pb-6">
              {/* Header strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-gray-100 bg-white px-5 py-2.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Bar className="size-9 shrink-0 rounded-xl" />
                  <Bar className="h-5 w-40" />
                  <Bar className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex flex-1 items-center gap-1.5">
                  <Bar className="h-5 w-52 rounded-full" />
                  <Bar className="h-5 w-24 rounded-full" />
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <Bar className="h-6 w-56 rounded-full" />
                  <Bar className="h-4 w-36" />
                  <Bar className="h-8 w-28" />
                </div>
              </div>

              {/* Section nav */}
              <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/90 p-1">
                {['w-32', 'w-40', 'w-52', 'w-40', 'w-80'].map((w, i) => (
                  <Bar key={i} className={clsx('h-9', w)} />
                ))}
              </div>

              <div className="flex flex-col gap-6">
                {/* s1: customers, purpose, channel and limits */}
                <CardShell>
                  <div className="flex flex-col gap-3">
                    <SubHeading />
                    <TableBlock rows={1} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <SubHeading />
                    <div className="grid grid-cols-12 gap-4">
                      <Field span="col-span-6" />
                      <Field span="col-span-3" />
                      <Field span="col-span-3" />
                    </div>
                    <Bar className="h-9 w-full" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <SubHeading />
                    <div className="grid grid-cols-12 gap-4">
                      <Field span="col-span-3" />
                      <Field span="col-span-3" />
                      <Field span="col-span-3" />
                      <Field span="col-span-3" />
                    </div>
                  </div>
                </CardShell>

                {/* s2: properties, dealer, location */}
                <CardShell>
                  <div className="flex flex-col gap-3">
                    <SubHeading />
                    <TableBlock rows={2} />
                    <div className="grid grid-cols-12 gap-4">
                      <Field span="col-span-6" hint />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <SubHeading />
                    <div className="grid grid-cols-12 gap-x-4 gap-y-6">
                      <Field span="col-span-2" />
                      <Field span="col-span-4" />
                      <Field span="col-span-2" />
                      <Field span="col-span-2" />
                      <Field span="col-span-2" />
                      <Field span="col-span-5" />
                      <Field span="col-span-7" />
                    </div>
                  </div>
                </CardShell>

                {/* s5: appointment and contact | fee */}
                <CardShell>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="grid grid-cols-12 content-start gap-x-4 gap-y-6">
                      <Field span="col-span-12" hint />
                      <Field span="col-span-12" tall hint />
                      <Field span="col-span-6" />
                      <Field span="col-span-6" />
                    </div>
                    <div className="grid grid-cols-12 content-start gap-x-4 gap-y-6">
                      <Field span="col-span-12" />
                      <Field span="col-span-12" tall hint />
                    </div>
                  </div>
                </CardShell>

                {/* Titles: header and a few rows */}
                <CardShell right={<Bar className="h-9 w-32" />}>
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Bar key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardShell>

                {/* Documents: header, toolbar, drop zone, rows */}
                <CardShell right={<Bar className="h-4 w-24" />}>
                  <div className="flex flex-col gap-3">
                    <Bar className="h-9 w-full" />
                    <Bar className="h-16 w-full" />
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Bar key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </CardShell>
              </div>
            </div>
          </div>

          {/* Action bar: not on the read-only page. data-page-actions: the layouts drop their bottom
              padding for it, as for the real bar. */}
          {!readOnly && (
            <div
              data-page-actions=""
              className="shrink-0 border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bar className="h-10 w-16" />
                  <Bar className="size-9" />
                </div>
                <div className="flex items-center gap-3">
                  <Bar className="h-7 w-28 rounded-full" />
                  <Bar className="h-10 w-24" />
                  <Bar className="h-10 w-24" />
                  <Bar className="h-10 w-20" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestPageSkeleton;
