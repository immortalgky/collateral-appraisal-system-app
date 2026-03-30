import { useNavigate } from 'react-router-dom';
import { useGetDefinitions } from '../api';
import type { WorkflowDefinitionSummary } from '../types';

export default function WorkflowListPage() {
  const navigate = useNavigate();
  const { data: definitions, isLoading, error } = useGetDefinitions();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          Failed to load workflow definitions.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflow Definitions</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/workflow-builder/new')}
        >
          Create New Workflow
        </button>
      </div>

      {!definitions || definitions.length === 0 ? (
        <div className="rounded-lg border border-base-300 p-12 text-center">
          <p className="text-base-content/60">
            No workflow definitions yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Version</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((def: WorkflowDefinitionSummary) => (
                <tr key={def.id} className="hover">
                  <td className="font-medium">{def.name}</td>
                  <td>
                    <span className="badge badge-ghost badge-sm">
                      {def.category}
                    </span>
                  </td>
                  <td>v{def.version}</td>
                  <td>
                    <span
                      className={`badge badge-sm ${
                        def.isActive ? 'badge-success' : 'badge-ghost'
                      }`}
                    >
                      {def.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-sm text-base-content/60">
                    {new Date(def.createdOn).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() =>
                        navigate(`/workflow-builder/${def.id}`)
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
