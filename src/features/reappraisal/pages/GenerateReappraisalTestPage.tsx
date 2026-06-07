import { useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import {
  useGenerateReappraisalTestFile,
  type GenerateReappraisalTestFileResult,
} from '../api/reappraisal';

export default function GenerateReappraisalTestPage() {
  const [count, setCount] = useState(20);
  const [date, setDate] = useState(''); // YYYY-MM-DD from <input type="date">
  const [result, setResult] = useState<GenerateReappraisalTestFileResult | null>(null);

  const { mutate: generate, isPending } = useGenerateReappraisalTestFile();

  const handleGenerate = () => {
    // Convert YYYY-MM-DD → yyyyMMdd; omit if blank so server defaults to today
    const dateParam = date ? date.replace(/-/g, '') : undefined;

    generate(
      { count, date: dateParam },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`Generated ${data.rowCount} rows`);
        },
        onError: (e: any) => {
          toast.error(e.apiError?.detail ?? 'Failed to generate test file');
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Generate Reappraisal Test File</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Writes a COLLATREV fixed-width file into the server ingestion inbox for QA testing.
            The reappraisal ingestion job will consume it on next run.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-end gap-3 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700" htmlFor="gen-count">
            Row count
          </label>
          <input
            id="gen-count"
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) setCount(Math.min(500, Math.max(1, v)));
            }}
            className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white hover:border-gray-300 focus:border-primary"
          />
          <p className="text-xs text-gray-400">1 – 500 (server also clamps)</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700" htmlFor="gen-date">
            Effective date
          </label>
          <input
            id="gen-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white hover:border-gray-300 focus:border-primary"
          />
          <p className="text-xs text-gray-400">Leave blank to default to today</p>
        </div>

        <Button
          size="sm"
          onClick={handleGenerate}
          isLoading={isPending}
        >
          <Icon style="solid" name="file-export" className="size-3.5 mr-1.5" />
          Generate
        </Button>
      </div>

      {/* Result panel */}
      {result && (
        <div className="shrink-0 bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="circle-check" style="solid" className="size-4 text-green-600" />
            <span className="text-sm font-semibold text-gray-900">File generated</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="text-gray-500">Row count</div>
            <div className="font-medium text-gray-900">{result.rowCount}</div>

            <div className="text-gray-500">Server file path</div>
            <div className="font-mono text-xs text-gray-700 break-all">{result.filePath}</div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-gray-700">
              Survey numbers ({result.surveyNumbers.length})
            </p>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg bg-gray-50 p-2">
              {result.surveyNumbers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">None</p>
              ) : (
                <ul className="space-y-0.5">
                  {result.surveyNumbers.map((sn) => (
                    <li key={sn} className="font-mono text-xs text-gray-700">
                      {sn}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
