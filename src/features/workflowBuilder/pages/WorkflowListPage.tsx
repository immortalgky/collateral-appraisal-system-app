import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetDefinitions } from '../api';
import type { WorkflowDefinitionSummary } from '../types';

export default function WorkflowListPage() {
  const { t } = useTranslation('workflowBuilder');
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
        <div className="alert alert-error">{t('errors.failedToLoadDefinitions')}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('page.listTitle')}</h1>
        <button className="btn btn-primary" onClick={() => navigate('/workflow-builder/new')}>
          {t('page.createNew')}
        </button>
      </div>

      {!definitions || definitions.length === 0 ? (
        <div className="rounded-lg border border-base-300 p-12 text-center">
          <p className="text-base-content/60">{t('page.empty')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('list.columns.name')}</th>
                <th>{t('list.columns.category')}</th>
                <th>{t('list.columns.version')}</th>
                <th>{t('list.columns.status')}</th>
                <th>{t('list.columns.created')}</th>
                <th>{t('list.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((def: WorkflowDefinitionSummary) => (
                <tr key={def.id} className="hover">
                  <td className="font-medium">{def.name}</td>
                  <td>
                    <span className="badge badge-ghost badge-sm">{def.category}</span>
                  </td>
                  <td>v{def.version}</td>
                  <td>
                    <span
                      className={`badge badge-sm ${def.isActive ? 'badge-success' : 'badge-ghost'}`}
                    >
                      {def.isActive ? t('list.status.active') : t('list.status.inactive')}
                    </span>
                  </td>
                  <td className="text-sm text-base-content/60">
                    {new Date(def.createdOn).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => navigate(`/workflow-builder/${def.id}`)}
                    >
                      {t('list.actions.edit')}
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
