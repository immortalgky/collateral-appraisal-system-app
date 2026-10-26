import Icon from '@/shared/components/Icon';

/** The list could not be loaded: what, and the reason the request gave. */
export function TaskLoadError({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <Icon style="solid" name="triangle-exclamation" className="text-xl text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        {message && <p className="mt-0.5 text-xs text-gray-500">{message}</p>}
      </div>
    </div>
  );
}
