type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'property' | 'document' | 'chart' | 'search';
  text?: string;
};

const sizeMap = {
  sm: { wrapper: 'w-8 h-8', icon: 16, text: 'text-xs' },
  md: { wrapper: 'w-12 h-12', icon: 24, text: 'text-sm' },
  lg: { wrapper: 'w-16 h-16', icon: 32, text: 'text-base' },
  xl: { wrapper: 'w-24 h-24', icon: 48, text: 'text-lg' },
};

// Building/Property spinner - building with pulsing windows
function PropertySpinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Building outline */}
      <path
        d="M8 44V18L24 6L40 18V44H8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-200"
      />
      {/* Roof */}
      <path
        d="M4 20L24 4L44 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-500"
      />
      {/* Door */}
      <rect x="20" y="32" width="8" height="12" rx="1" fill="currentColor" className="text-blue-500" />
      {/* Windows with animation */}
      <rect x="12" y="22" width="6" height="6" rx="1" fill="currentColor" className="text-blue-400 animate-pulse" style={{ animationDelay: '0ms' }} />
      <rect x="30" y="22" width="6" height="6" rx="1" fill="currentColor" className="text-blue-400 animate-pulse" style={{ animationDelay: '200ms' }} />
      <rect x="12" y="32" width="6" height="6" rx="1" fill="currentColor" className="text-blue-400 animate-pulse" style={{ animationDelay: '400ms' }} />
      <rect x="30" y="32" width="6" height="6" rx="1" fill="currentColor" className="text-blue-400 animate-pulse" style={{ animationDelay: '600ms' }} />
    </svg>
  );
}

// Document/Report spinner - document with scanning line
function DocumentSpinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Document background */}
      <path
        d="M10 6C10 4.89543 10.8954 4 12 4H28L38 14V42C38 43.1046 37.1046 44 36 44H12C10.8954 44 10 43.1046 10 42V6Z"
        fill="currentColor"
        className="text-blue-100"
      />
      {/* Document border */}
      <path
        d="M10 6C10 4.89543 10.8954 4 12 4H28L38 14V42C38 43.1046 37.1046 44 36 44H12C10.8954 44 10 43.1046 10 42V6Z"
        stroke="currentColor"
        strokeWidth="2"
        className="text-blue-500"
      />
      {/* Folded corner */}
      <path d="M28 4V14H38" stroke="currentColor" strokeWidth="2" className="text-blue-500" />
      {/* Text lines */}
      <rect x="14" y="20" width="16" height="2" rx="1" fill="currentColor" className="text-blue-300" />
      <rect x="14" y="26" width="20" height="2" rx="1" fill="currentColor" className="text-blue-300" />
      <rect x="14" y="32" width="12" height="2" rx="1" fill="currentColor" className="text-blue-300" />
      {/* Scanning line */}
      <rect x="14" y="18" width="20" height="2" rx="1" fill="currentColor" className="text-blue-500">
        <animate attributeName="y" values="18;36;18" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
      </rect>
      {/* Checkmark that appears */}
      <circle cx="36" cy="38" r="8" fill="currentColor" className="text-emerald-500">
        <animate attributeName="opacity" values="0;0;1;1;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M32 38L35 41L40 35" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="opacity" values="0;0;1;1;0" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

// Chart/Valuation spinner - bar chart with growing bars
function ChartSpinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Axes */}
      <path d="M8 8V40H40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-300" />
      {/* Grid lines */}
      <path d="M8 30H40" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-blue-200" />
      <path d="M8 20H40" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-blue-200" />
      {/* Bars with animation */}
      <rect x="12" y="40" width="6" height="0" fill="currentColor" className="text-blue-400">
        <animate attributeName="height" values="0;20;0" dur="1.5s" repeatCount="indefinite" begin="0s" />
        <animate attributeName="y" values="40;20;40" dur="1.5s" repeatCount="indefinite" begin="0s" />
      </rect>
      <rect x="21" y="40" width="6" height="0" fill="currentColor" className="text-blue-500">
        <animate attributeName="height" values="0;28;0" dur="1.5s" repeatCount="indefinite" begin="0.2s" />
        <animate attributeName="y" values="40;12;40" dur="1.5s" repeatCount="indefinite" begin="0.2s" />
      </rect>
      <rect x="30" y="40" width="6" height="0" fill="currentColor" className="text-emerald-500">
        <animate attributeName="height" values="0;32;0" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
        <animate attributeName="y" values="40;8;40" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
      </rect>
      {/* Dollar sign */}
      <circle cx="38" cy="10" r="6" fill="currentColor" className="text-amber-400">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
      </circle>
      <text x="38" y="13" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">$</text>
    </svg>
  );
}

// Search/Inspection spinner - magnifying glass scanning
function SearchSpinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* House being inspected */}
      <path
        d="M10 40V24L22 14L34 24V40H10Z"
        stroke="currentColor"
        strokeWidth="2"
        className="text-blue-200"
      />
      <path d="M6 26L22 12L38 26" stroke="currentColor" strokeWidth="2" className="text-blue-300" />
      <rect x="18" y="30" width="8" height="10" fill="currentColor" className="text-blue-300" />

      {/* Magnifying glass with rotation */}
      <g className="origin-center">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 30 18"
          to="360 30 18"
          dur="3s"
          repeatCount="indefinite"
        />
        <circle cx="30" cy="18" r="8" stroke="currentColor" strokeWidth="2.5" fill="white" fillOpacity="0.8" className="text-blue-500" />
        <line x1="36" y1="24" x2="42" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-blue-500" />
        {/* Sparkle inside magnifying glass */}
        <circle cx="28" cy="16" r="2" fill="currentColor" className="text-blue-400">
          <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

// Default circular spinner with property icon
function DefaultSpinner({ size }: { size: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Spinning ring */}
      <svg width={size} height={size} viewBox="0 0 48 48" className="animate-spin">
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-blue-100"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray="31.4 94.2"
          strokeLinecap="round"
          className="text-blue-500"
        />
      </svg>
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 21V9L12 3L21 9V21H3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          />
          <rect x="9" y="13" width="6" height="8" fill="currentColor" className="text-blue-400" />
        </svg>
      </div>
    </div>
  );
}

function LoadingSpinner({ size = 'md', variant = 'default', text }: LoadingSpinnerProps) {
  const { wrapper, icon, text: textSize } = sizeMap[size];

  const renderSpinner = () => {
    switch (variant) {
      case 'property':
        return <PropertySpinner size={icon} />;
      case 'document':
        return <DocumentSpinner size={icon} />;
      case 'chart':
        return <ChartSpinner size={icon} />;
      case 'search':
        return <SearchSpinner size={icon} />;
      default:
        return <DefaultSpinner size={icon} />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={wrapper}>{renderSpinner()}</div>
      {text && <p className={`text-gray-500 font-medium ${textSize}`}>{text}</p>}
    </div>
  );
}

export default LoadingSpinner;
