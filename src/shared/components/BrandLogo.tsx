import { Link } from 'react-router-dom';

type BrandLogoProps = {
  /** The LH Bank wordmark; only its "LH" + colour-bar corner is shown. */
  logo: string;
  onClick?: () => void;
};

/** Sidebar brand block; the whole block links home. */
export default function BrandLogo({ logo, onClick }: BrandLogoProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="CAS, go to Home"
      className="flex items-center min-w-0 gap-2.5 py-1.5 pl-2 pr-1.5 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* The wordmark is 242×59 with "LH" + bars in its left 60 units: scale to 29px tall, clip to 30px wide. */}
      <span className="block w-[30px] h-[29px] overflow-hidden shrink-0">
        <img alt="LH Bank" src={logo} className="h-full w-auto max-w-none" />
      </span>

      <span className="w-px self-stretch my-1 bg-gray-200 dark:bg-base-300" />
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[17px] leading-none font-black tracking-tight text-gray-900 dark:text-gray-100">
          CAS
        </span>
        <span className="text-[10px] font-medium text-gray-400 truncate">
          Collateral Appraisal System
        </span>
      </span>
    </Link>
  );
}
