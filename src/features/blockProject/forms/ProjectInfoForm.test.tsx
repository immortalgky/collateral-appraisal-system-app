import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import type { ProjectType } from '../types';
import ProjectInfoForm from './ProjectInfoForm';

const read = vi.hoisted(() => ({ on: false }));

// Fields are listed by name, so the test can see which ones a type renders without the input kit.
vi.mock('@/shared/components/form', () => ({
  FormFields: ({ fields }: { fields: { name: string }[] }) => (
    <>
      {fields.map(f => (
        <span key={f.name} data-testid="field">
          {f.name}
        </span>
      ))}
    </>
  ),
  FormFieldShell: ({ label, children }: { label?: string; children: ReactNode }) => (
    <div data-testid="read-field">
      {label}: {children}
    </div>
  ),
  FormReadValue: ({ value }: { value: string | null }) => <span>{value ?? '—'}</span>,
  useFormReadOnly: () => read.on,
  FormSection: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  FormSheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/features/appraisal/components/FieldLabels', () => ({
  FieldLabels: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/shared/components/MapLocationPicker', () => ({
  MapLocationPicker: () => null,
  MapPickerTriggerIcon: () => null,
}));
vi.mock('../components/ProjectTypePill', () => ({ default: () => null }));
vi.mock('../components/PartialDateInput', () => ({ default: () => null }));
vi.mock('../components/condo', () => ({ CondoUnitForSaleHint: () => null }));

const Harness = ({
  projectType,
  launchDate,
}: {
  projectType: ProjectType;
  launchDate?: string;
}) => {
  const methods = useForm({ defaultValues: { projectSaleLaunchDate: launchDate ?? null } });
  return (
    <FormProvider {...methods}>
      <ProjectInfoForm
        projectType={projectType}
        pendingType={null}
        hasExistingProject
        onProjectTypeChange={() => {}}
      />
    </FormProvider>
  );
};

const renderedFields = () => screen.getAllByTestId('field').map(el => el.textContent);

describe('ProjectInfoForm construction progress', () => {
  it.each<ProjectType>(['U', 'LB'])('is shown for %s', projectType => {
    render(<Harness projectType={projectType} />);
    expect(renderedFields()).toEqual(
      expect.arrayContaining(['isUnderConstruction', 'constructionProgressPercent']),
    );
  });

  it('is hidden for L (appraised as land only)', () => {
    render(<Harness projectType="L" />);
    const fields = renderedFields();
    expect(fields).not.toContain('isUnderConstruction');
    expect(fields).not.toContain('constructionProgressPercent');
    expect(fields).toContain('unitForSaleCount');
    // L keeps the license expiration date LB has.
    expect(fields).toContain('licenseExpirationDate');
  });
});

describe('ProjectInfoForm sale launch date on a read page', () => {
  it('is text, as the control would show it, not three disabled dropdowns', () => {
    read.on = true;
    render(<Harness projectType="U" launchDate="2026-03" />);
    expect(screen.getByTestId('read-field')).toHaveTextContent(
      /Project Sale Launch Date: March 2026/i,
    );
    read.on = false;
  });

  it('shows a dash when empty', () => {
    read.on = true;
    render(<Harness projectType="U" />);
    expect(screen.getByTestId('read-field')).toHaveTextContent('—');
    read.on = false;
  });
});
