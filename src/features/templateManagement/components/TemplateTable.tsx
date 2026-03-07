import { useNavigate } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';

interface TemplateRow {
  id: string;
  templateCode: string;
  templateName: string;
  propertyType: string;
  description: string | null;
  isActive: boolean;
  factorCount?: number;
}

interface TemplateTableProps {
  templates: TemplateRow[];
  basePath: string;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

const TemplateTable = ({ templates, basePath, onDelete, isLoading, isDeleting }: TemplateTableProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon name="rectangle-list" style="regular" className="size-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No templates found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr className="bg-primary/10">
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg">Code</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Name</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Property Type</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Description</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Status</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg">Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr
              key={template.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`${basePath}/${template.id}`)}
            >
              <td className="py-3 px-4 text-sm font-mono text-gray-700">{template.templateCode}</td>
              <td className="py-3 px-4 text-sm text-gray-900 font-medium">{template.templateName}</td>
              <td className="py-3 px-4 text-sm text-gray-600">{template.propertyType}</td>
              <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">
                {template.description || '-'}
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    template.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {template.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => navigate(`${basePath}/${template.id}`)}
                    leftIcon={<Icon name="pen-to-square" style="regular" className="size-3.5" />}
                  >
                    Edit
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={isDeleting}
                      onClick={() => onDelete(template.id)}
                      leftIcon={<Icon name="trash-can" style="regular" className="size-3.5 text-danger" />}
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TemplateTable;
