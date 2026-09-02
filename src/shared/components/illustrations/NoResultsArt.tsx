/**
 * Nothing matched: the appraisal officer who searched, found nothing, and is standing there crying
 * about it.
 *
 * Original doc: the empty state's mascot: an appraisal officer who searched, found nothing, and is standing
 * there crying about it — anime chibi, one fist rubbing an eye, magnifier hanging forgotten.
 *
 * The pose carries the message, not just the face: slumped shoulders, feet turned in, the tool
 * lowered to the floor. Someone reads that in the half-second before they get to "no appraisals
 * found". Chibi proportions on purpose — the head is about as tall as the whole body, which is
 * what makes a small figure endearing rather than pitiful. Hand-drawn SVG rather than a bitmap:
 * sharp at any size, weighs nothing, and takes its colours from the product's own palette (teal
 * blazer, gold tie and magnifier). Deliberately generic staff — no logo, no badge text — so
 * nobody in particular has to be the one crying.
 */
function NoResultsArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 170 140"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="88" cy="131" rx="58" ry="7" fill="#0D9488" opacity="0.1" />

      <g>
        {/* Legs, and feet turned inward — the stance does as much of the crying as the face */}
        <rect x="81" y="105" width="8" height="14" rx="3.6" fill="#334155" />
        <rect x="94" y="105" width="8" height="14" rx="3.6" fill="#334155" />
        <ellipse cx="83" cy="122" rx="7.5" ry="4.2" fill="#1E293B" transform="rotate(-14 83 122)" />
        <ellipse
          cx="100"
          cy="122"
          rx="7.5"
          ry="4.2"
          fill="#1E293B"
          transform="rotate(14 100 122)"
        />

        {/* Sleeves drawn first so the blazer sits over the shoulder seam */}
        <path
          d="M104 90 L110 105"
          stroke="#0B7A70"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />

        {/* Blazer with sloping shoulders and lapels — a jacket, not a box */}
        <path
          d="M75 86 q1 -8 9 -10 l7 -2 l7 2 q8 2 9 10 l1 17 q0 5 -5 5 h-24 q-5 0 -5 -5 Z"
          fill="#0D9488"
        />
        <path d="M91 74 l-7 4 l7 13 l7 -13 Z" fill="#F8FAFC" />
        <path d="M84 78 l7 4 l-3 8 Z" fill="#0B7A70" />
        <path d="M98 78 l-7 4 l3 8 Z" fill="#0B7A70" />
        <path d="M91 82 l-3 5 l3 10 l3 -10 Z" fill="#D97706" />
        {/* Staff badge — a shape, no text */}
        <rect x="79" y="93" width="8" height="5.5" rx="1.4" fill="#F8FAFC" opacity="0.9" />

        {/* Head */}
        <rect x="86" y="66" width="10" height="8" rx="3" fill="#E3AF87" />
        <circle cx="91" cy="46" r="26" fill="#F3C7A2" />
        <circle cx="65" cy="49" r="4" fill="#F3C7A2" />
        <circle cx="117" cy="49" r="4" fill="#F3C7A2" />

        {/* Spiky fringe, side locks and one stray ahoge */}
        <path
          d="M65 46 q0 -30 26 -30 q26 0 26 30 q-6 -13 -13 -15 q-5 8 -13 6 q-9 -2 -13 -8 q-8 6 -13 17 Z"
          fill="#1F2937"
        />
        <path d="M88 17 q4 -10 11 -9 q-7 3 -8 10 Z" fill="#1F2937" />
        <path d="M65 44 q-3 13 1 22 q5 -11 3 -22 Z" fill="#1F2937" />
        <path d="M117 44 q3 13 -1 22 q-5 -11 -3 -22 Z" fill="#1F2937" />

        {/* Brows: inner ends high — the angle that separates sad from angry */}
        <path
          d="M96 38 q7 -5 13 2"
          fill="none"
          stroke="#1F2937"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* The eye that is not being rubbed: big, wet, two highlights */}
        <ellipse cx="102" cy="49" rx="6" ry="7.2" fill="#1F2937" />
        <circle cx="100" cy="46" r="2.3" fill="#F8FAFC" />
        <circle cx="104.4" cy="52" r="1.2" fill="#F8FAFC" opacity="0.85" />

        {/* Open, wailing mouth */}
        <path d="M84 60 q6 11 12 1 q-6 -4 -12 -1 Z" fill="#1F2937" />
        <path d="M87.5 64 q3.5 4 6 0 q-3 -2 -6 0 Z" fill="#FB7185" opacity="0.8" />

        <circle cx="76" cy="59" r="4.6" fill="#FB7185" opacity="0.34" />
        <circle cx="110" cy="59" r="4.6" fill="#FB7185" opacity="0.34" />

        {/* Tears: a stream off the open eye, drops still falling from behind the fist */}
        <path d="M104 57 q3 9 1 15 q-4 -5 -3 -15 Z" fill="#38BDF8" opacity="0.75" />
        <path d="M106 78 q-3 4 0 6 q3 -2 0 -6 Z" fill="#38BDF8" opacity="0.6" />
        <path d="M74 66 q-3 4 0 6 q3 -2 0 -6 Z" fill="#38BDF8" opacity="0.6" />
        <path d="M71 82 q-2.5 3.5 0 5 q2.5 -1.5 0 -5 Z" fill="#38BDF8" opacity="0.45" />

        {/* The arm that is doing the crying: raised across the body, elbow out, fist in the eye.
            Drawn after the blazer and the head so the whole limb is visible in front of them. */}
        <path
          d="M77 96 q-6 -16 2 -28"
          fill="none"
          stroke="#0D9488"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M78 70 q1 -4 3 -6"
          fill="none"
          stroke="#0B7A70"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <rect
          x="75"
          y="60"
          width="11"
          height="4"
          rx="2"
          fill="#F8FAFC"
          transform="rotate(-12 80 62)"
        />
        <circle cx="82" cy="53" r="8" fill="#F3C7A2" stroke="#E3AF87" strokeWidth="1.4" />
        <path
          d="M76.5 51 q5.5 -2.5 11 0"
          fill="none"
          stroke="#E3AF87"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M76.5 55.5 q5.5 -2.5 11 0"
          fill="none"
          stroke="#E3AF87"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Magnifier, lowered to the floor in the hand he is not crying into */}
        <circle cx="113" cy="106" r="4.5" fill="#F3C7A2" />
        <path d="M116 110 L120 114" stroke="#B45309" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="127" cy="119" r="9.5" fill="#5EEAD4" opacity="0.34" />
        <circle cx="127" cy="119" r="9.5" fill="none" stroke="#D97706" strokeWidth="3.6" />
      </g>

      {/* Anime sweat drop off the temple */}
      <path d="M126 26 q-5 7 0 10 q5 -3 0 -10 Z" fill="#38BDF8" opacity="0.7" />
      <path
        d="M143 40 l2.2 5.2 5.2 2.2 -5.2 2.2 -2.2 5.2 -2.2 -5.2 -5.2 -2.2 5.2 -2.2 Z"
        fill="#F59E0B"
        opacity="0.6"
      />
      <circle cx="56" cy="34" r="2.6" fill="#99F6E4" />
    </svg>
  );
}

export default NoResultsArt;
