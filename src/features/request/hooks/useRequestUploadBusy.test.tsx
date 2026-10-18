import { useEffect, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  FormProvider,
  useForm,
  useFormContext,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { REQUEST_DOCUMENT_UPLOADS } from '../types/document';
import { useRequestUploadBusy } from './useRequestUploadBusy';

const defaultValues = {
  documents: [{ documentType: 'D1', fileName: null }],
  titles: [{ titleNumber: '1', documents: [{ documentType: 'D2', fileName: 'a.pdf' }] }],
};

type Holder = { current: UseFormReturn<FieldValues> | null };

/** Hands the form to the test, which has no other way to type into it. */
const CaptureForm = ({ holder }: { holder: Holder }) => {
  const form = useFormContext();
  useEffect(() => {
    holder.current = form;
  }, [holder, form]);
  return null;
};

const FormWrapper = ({ holder, children }: { holder: Holder; children: ReactNode }) => {
  const form = useForm({ defaultValues });
  return (
    <FormProvider {...form}>
      <CaptureForm holder={holder} />
      {children}
    </FormProvider>
  );
};

const setup = () => {
  const holder: Holder = { current: null };
  let renders = 0;
  const hook = renderHook(
    () => {
      renders += 1;
      return useRequestUploadBusy();
    },
    { wrapper: ({ children }) => <FormWrapper holder={holder}>{children}</FormWrapper> },
  );
  return { hook, form: () => holder.current!, renders: () => renders };
};

describe('useRequestUploadBusy', () => {
  it('does not re-render, or change its answer, while typing in a title or document field', () => {
    useUploadProgressStore.setState({ batches: [] });
    const { hook, form, renders } = setup();
    expect(hook.result.current).toBe(false);
    const before = renders();

    act(() => form().setValue('titles.0.titleNumber', '12'));
    act(() => form().setValue('titles.0.titleNumber', '123'));
    act(() => form().setValue('documents.0.notes', 'typed'));

    expect(hook.result.current).toBe(false);
    expect(renders()).toBe(before);
  });

  it('turns true for a row that is uploading and false again, and follows the upload batch', () => {
    useUploadProgressStore.setState({ batches: [] });
    const { hook, form } = setup();

    act(() => form().setValue('titles.0.documents.0.isUploading', true));
    expect(hook.result.current).toBe(true);
    act(() => form().setValue('titles.0.documents.0.isUploading', false));
    expect(hook.result.current).toBe(false);

    act(() => useUploadProgressStore.setState({ batches: [REQUEST_DOCUMENT_UPLOADS] }));
    expect(hook.result.current).toBe(true);
    act(() => useUploadProgressStore.setState({ batches: [] }));
    expect(hook.result.current).toBe(false);
  });
});
