import Icon from '@shared/components/Icon';
import FormCard from '@shared/components/sections/FormCard';

export const LawsRegulationTab = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Laws & Regulations</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Relevant laws and regulations for property appraisal
        </p>
      </div>

      {/* Regulations Reference */}
      <FormCard title="Regulations Reference" subtitle="Relevant laws and regulations" icon="gavel" iconColor="amber">
        <div className="space-y-3">
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="link" className="text-blue-600" style="solid" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary">
                Land Code Act B.E. 2497
              </p>
              <p className="text-xs text-gray-500">Primary legislation governing land ownership</p>
            </div>
            <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
          </a>

          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="link" className="text-blue-600" style="solid" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary">
                Civil and Commercial Code
              </p>
              <p className="text-xs text-gray-500">Property rights and obligations</p>
            </div>
            <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
          </a>

          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="link" className="text-blue-600" style="solid" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary">
                Building Control Act B.E. 2522
              </p>
              <p className="text-xs text-gray-500">Building construction regulations</p>
            </div>
            <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
          </a>

          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="link" className="text-blue-600" style="solid" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary">
                Town Planning Act B.E. 2518
              </p>
              <p className="text-xs text-gray-500">Urban planning and zoning regulations</p>
            </div>
            <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
          </a>

          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="link" className="text-blue-600" style="solid" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary">
                Condominium Act B.E. 2522
              </p>
              <p className="text-xs text-gray-500">Condominium ownership and management</p>
            </div>
            <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
          </a>
        </div>
      </FormCard>

      {/* Appraisal Standards */}
      <FormCard title="Appraisal Standards" subtitle="Professional valuation guidelines" icon="scale-balanced" iconColor="purple">
        <div className="space-y-3">
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Icon name="book" className="text-indigo-600" style="solid" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary">
                Thai Valuation Standards (TVS)
              </p>
              <p className="text-xs text-gray-500">National valuation standards and practices</p>
            </div>
            <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
          </a>

          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Icon name="globe" className="text-indigo-600" style="solid" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary">
                International Valuation Standards (IVS)
              </p>
              <p className="text-xs text-gray-500">Global valuation framework and principles</p>
            </div>
            <Icon name="arrow-up-right-from-square" className="text-gray-400 group-hover:text-primary" />
          </a>
        </div>
      </FormCard>
    </div>
  );
};

export default LawsRegulationTab;
