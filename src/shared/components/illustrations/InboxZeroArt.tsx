/**
 * Nothing left to do: the same appraisal officer, arms up, empty tray at his feet.
 *
 * Deliberately the same character as {@link NoResultsArt} — same hair, same teal blazer, same gold
 * tie — because an empty queue and an empty search result are two different feelings and the
 * mascot is how the product tells them apart at a glance. Here: eyes shut in a grin, arms thrown
 * up, an out-tray with everything signed off. Hand-drawn SVG, product palette, no logo or badge
 * text so nobody in particular is the one slacking off.
 */
function InboxZeroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 170 140"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="88" cy="131" rx="58" ry="7" fill="#0D9488" opacity="0.1" />

      {/* The out-tray, emptied, with the last job signed off above it */}
      <g>
        <path d="M16 116 H50 L54 124 H12 Z" fill="#E2E8F0" />
        <path d="M12 124 H54 V128 H12 Z" fill="#CBD5E1" />
        <path d="M20 116 L23 109 H43 L46 116 Z" fill="#F1F5F9" />
        <circle cx="33" cy="99" r="9" fill="#DCFCE7" />
        <path
          d="M28.5 99 L32 102.5 L37.5 95.5"
          fill="none"
          stroke="#16A34A"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <g>
        {/* Feet apart, weight off — the opposite of the crying one's turned-in stance */}
        <rect x="80" y="105" width="8" height="14" rx="3.6" fill="#334155" />
        <rect x="95" y="105" width="8" height="14" rx="3.6" fill="#334155" />
        <ellipse cx="79" cy="122" rx="7.5" ry="4.2" fill="#1E293B" transform="rotate(12 79 122)" />
        <ellipse
          cx="104"
          cy="122"
          rx="7.5"
          ry="4.2"
          fill="#1E293B"
          transform="rotate(-12 104 122)"
        />

        {/* Blazer */}
        <path
          d="M75 86 q1 -8 9 -10 l7 -2 l7 2 q8 2 9 10 l1 17 q0 5 -5 5 h-24 q-5 0 -5 -5 Z"
          fill="#0D9488"
        />
        <path d="M91 74 l-7 4 l7 13 l7 -13 Z" fill="#F8FAFC" />
        <path d="M84 78 l7 4 l-3 8 Z" fill="#0B7A70" />
        <path d="M98 78 l-7 4 l3 8 Z" fill="#0B7A70" />
        <path d="M91 82 l-3 5 l3 10 l3 -10 Z" fill="#D97706" />
        <rect x="79" y="93" width="8" height="5.5" rx="1.4" fill="#F8FAFC" opacity="0.9" />

        {/* Head */}
        <rect x="86" y="66" width="10" height="8" rx="3" fill="#E3AF87" />
        <circle cx="91" cy="46" r="26" fill="#F3C7A2" />
        <circle cx="65" cy="49" r="4" fill="#F3C7A2" />
        <circle cx="117" cy="49" r="4" fill="#F3C7A2" />

        {/* Same hair as the other mascot, ahoge and all */}
        <path
          d="M65 46 q0 -30 26 -30 q26 0 26 30 q-6 -13 -13 -15 q-5 8 -13 6 q-9 -2 -13 -8 q-8 6 -13 17 Z"
          fill="#1F2937"
        />
        <path d="M88 17 q4 -10 11 -9 q-7 3 -8 10 Z" fill="#1F2937" />
        <path d="M65 44 q-3 13 1 22 q5 -11 3 -22 Z" fill="#1F2937" />
        <path d="M117 44 q3 13 -1 22 q-5 -11 -3 -22 Z" fill="#1F2937" />

        {/* Eyes shut in a grin — the ^ ^ that says this is relief, not blankness */}
        <path
          d="M76 51 q6 -8 12 0"
          fill="none"
          stroke="#1F2937"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M94 51 q6 -8 12 0"
          fill="none"
          stroke="#1F2937"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M74 42 q7 -4 13 1"
          fill="none"
          stroke="#1F2937"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M108 42 q-7 -4 -13 1"
          fill="none"
          stroke="#1F2937"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />

        <path d="M84 58 q7 12 14 0 q-7 4 -14 0 Z" fill="#1F2937" />
        <path d="M87.5 63 q3.5 4 7 0 q-3.5 -2 -7 0 Z" fill="#FB7185" opacity="0.8" />
        <circle cx="74" cy="58" r="4.8" fill="#FB7185" opacity="0.4" />
        <circle cx="108" cy="58" r="4.8" fill="#FB7185" opacity="0.4" />

        {/* Both arms thrown up */}
        <path
          d="M79 90 q-16 -14 -19 -48"
          fill="none"
          stroke="#0D9488"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M103 90 q16 -14 19 -48"
          fill="none"
          stroke="#0D9488"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle cx="59" cy="38" r="6.5" fill="#F3C7A2" stroke="#E3AF87" strokeWidth="1.3" />
        <circle cx="123" cy="38" r="6.5" fill="#F3C7A2" stroke="#E3AF87" strokeWidth="1.3" />
      </g>

      {/* Confetti and sparkles */}
      <path
        d="M140 44 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z"
        fill="#F59E0B"
        opacity="0.85"
      />
      <path
        d="M40 62 l1.9 4.4 4.4 1.9 -4.4 1.9 -1.9 4.4 -1.9 -4.4 -4.4 -1.9 4.4 -1.9 Z"
        fill="#2DD4BF"
        opacity="0.85"
      />
      <rect
        x="128"
        y="72"
        width="5"
        height="5"
        rx="1"
        fill="#38BDF8"
        transform="rotate(24 130 74)"
      />
      <rect
        x="52"
        y="24"
        width="5"
        height="5"
        rx="1"
        fill="#FB7185"
        transform="rotate(-18 48 22)"
      />
      <circle cx="132" cy="30" r="3" fill="#99F6E4" />
      <circle cx="36" cy="70" r="2.6" fill="#FBBF24" opacity="0.9" />
    </svg>
  );
}

export default InboxZeroArt;
