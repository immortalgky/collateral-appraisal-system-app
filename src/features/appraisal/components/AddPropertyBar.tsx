import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import PropertyTypeDropdown from './PropertyTypeDropdown';
import { usePropertyBasePath } from '../hooks/usePropertyBasePath';
import {
  getPropertyIcon,
  getTypeDotColor,
  PROPERTY_BASE_ORDER,
  PROPERTY_TYPES,
  typeToBase,
  typeToTenure,
} from '../utils/propertyTypeConfig';

/**
 * Every freehold type gets a button, in the shared base order so the bar and the picker read the
 * same way round. Derived from `typeToTenure` rather than listed by hand, so a freehold type
 * added later turns up here on its own instead of quietly staying two clicks away.
 *
 * Freehold is what actually gets added: on the development database land accounts for 105,297 of
 * the 105,643 properties on record, then land-and-building 178, condominium 63 and building 52.
 * The four lease types come to twenty between them and stay behind "more types".
 */
const quickRank = (code: string) => {
  const i = PROPERTY_BASE_ORDER.indexOf(typeToBase[code]);
  return i === -1 ? PROPERTY_BASE_ORDER.length : i;
};

interface AddPropertyBarProps {
  groupId: string;
  className?: string;
}

/**
 * The footer of a group: add the usual thing in one click, everything else behind one more.
 *
 * The old footer was a single button that opened a list of eleven — two clicks and a read every
 * time, including for the type that accounts for virtually every property anyone adds.
 */
export const AddPropertyBar = ({ groupId, className }: AddPropertyBarProps) => {
  const { t } = useTranslation('appraisal');
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const layoutBasePath = useBasePath();
  const propertyBasePath = usePropertyBasePath();

  const quick = PROPERTY_TYPES.filter(p => typeToTenure[p.code] === 'own' && p.route).sort(
    (a, b) => quickRank(a.code) - quickRank(b.code),
  );

  const add = (route: string, type: string) => {
    const target = appraisalId
      ? `${layoutBasePath}/${propertyBasePath}/${route}/new`
      : `/${route}-detail`;
    navigate(`${target}?groupId=${groupId}&type=${encodeURIComponent(type)}`);
  };

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-1.5 border-t border-dashed border-gray-300 bg-gray-50/60 px-3 py-1.5',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600">
        <Icon name="plus" className="text-[10px]" style="solid" />
        {t('properties.picker.addShort')}
      </span>

      {quick.map(type => (
        <button
          key={type.code}
          type="button"
          onClick={() => add(type.route as string, type.type)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-900"
        >
          <span
            className={clsx(
              'flex size-[1.15rem] items-center justify-center rounded',
              getTypeDotColor(type.code).replace('bg-', 'text-'),
            )}
            style={{ backgroundColor: 'color-mix(in srgb, currentColor 20%, transparent)' }}
          >
            <Icon
              name={getPropertyIcon(type.code).name}
              style={getPropertyIcon(type.code).style}
              className="text-[0.72rem]"
            />
          </span>
          <ParameterDisplay group="PropertyType" code={type.code} fallback={type.type} />
        </button>
      ))}

      {/* The last chip in the row rather than something pushed to the far edge: it is the same
          kind of choice as the four beside it, just for the rarer types. `shrink-0` keeps it
          whole at any width — the row wraps rather than squeezing it away. */}
      <PropertyTypeDropdown
        groupId={groupId}
        className="shrink-0"
        buttonLabel={t('properties.picker.other')}
        buttonClassName="gap-1.5 rounded-full border border-dashed border-gray-400 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-100 hover:text-gray-900"
      />
    </div>
  );
};

export default AddPropertyBar;
