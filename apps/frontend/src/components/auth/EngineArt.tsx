import {
  authCandles,
  authPalette,
  authPulseInner,
  authPulseOuter,
} from './theme'

export function EngineArt() {
  return (
    <svg viewBox="0 0 640 640" className="auth-engine-art" aria-hidden>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={authPalette.accent} stopOpacity="0.9" />
          <stop offset="55%" stopColor={authPalette.accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={authPalette.accent} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={authPalette.accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={authPalette.accent} stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <text
        x="320"
        y="400"
        textAnchor="middle"
        fontSize="330"
        fill="none"
        stroke={authPalette.baseLine}
        strokeOpacity="0.05"
        strokeWidth="2"
        fontFamily="Georgia, serif"
      >
        &#8734;
      </text>
      <g opacity="0.5">
        {authCandles.map((c, i) => {
          const x = 100 + i * 34
          const y = 500 - c.h
          const col = c.up ? authPalette.accentStrong : authPalette.candleDown
          return (
            <g key={i} opacity="0.35">
              <line
                x1={x}
                y1={y - 10}
                x2={x}
                y2={y + c.h + 10}
                stroke={col}
                strokeWidth="1.5"
              />
              <rect
                x={x - 6}
                y={y}
                width="12"
                height={c.h}
                rx="2"
                fill={col}
              />
            </g>
          )
        })}
      </g>
      <circle
        cx="320"
        cy="300"
        r="296"
        fill="none"
        stroke={authPalette.baseLine}
        strokeOpacity="0.08"
        strokeWidth="1"
        strokeDasharray="2 12"
      />
      <g className="auth-orbit-ring">
        <circle
          cx="320"
          cy="300"
          r="252"
          fill="none"
          stroke={authPalette.accent}
          strokeOpacity="0.22"
          strokeWidth="1"
          strokeDasharray="24 18"
        />
        <circle
          cx="320"
          cy="48"
          r="3.5"
          fill={authPalette.accent}
          opacity="0.8"
        />
      </g>
      <g transform="rotate(-18 320 300)">
        <ellipse
          cx="320"
          cy="300"
          rx="270"
          ry="104"
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="1.5"
        />
        <ellipse
          cx="320"
          cy="300"
          rx="214"
          ry="82"
          fill="none"
          stroke={authPalette.baseLine}
          strokeOpacity="0.14"
          strokeWidth="1"
        />
        <ellipse
          cx="320"
          cy="300"
          rx="158"
          ry="60"
          fill="none"
          stroke={authPalette.accent}
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeDasharray="6 8"
        />
        <circle r="5" fill={authPalette.accent} filter="url(#soft)">
          <animateMotion
            dur="7s"
            repeatCount="indefinite"
            path={authPulseOuter}
          />
        </circle>
        <circle r="2.5" fill={authPalette.accentSoft}>
          <animateMotion
            dur="7s"
            repeatCount="indefinite"
            path={authPulseOuter}
          />
        </circle>
        <circle
          r="3.5"
          fill={authPalette.accent}
          opacity="0.7"
          filter="url(#soft)"
        >
          <animateMotion
            dur="11s"
            begin="-4s"
            repeatCount="indefinite"
            path={authPulseInner}
          />
        </circle>
      </g>
      <circle cx="320" cy="300" r="72" fill="url(#coreGlow)" />
      <line
        x1="248"
        y1="300"
        x2="392"
        y2="300"
        stroke={authPalette.baseLine}
        strokeOpacity="0.2"
      />
      <line
        x1="320"
        y1="228"
        x2="320"
        y2="372"
        stroke={authPalette.baseLine}
        strokeOpacity="0.2"
      />
      <circle
        cx="320"
        cy="300"
        r="26"
        fill="none"
        stroke={authPalette.accent}
        strokeOpacity="0.6"
      />
      <circle cx="320" cy="300" r="5" fill={authPalette.accentSoft} />
      <text
        x="320"
        y="352"
        textAnchor="middle"
        fontSize="11"
        fill={authPalette.accent}
        fillOpacity="0.7"
        fontFamily="monospace"
        letterSpacing="3"
      >
        PERP-ENGINE
      </text>
    </svg>
  )
}
