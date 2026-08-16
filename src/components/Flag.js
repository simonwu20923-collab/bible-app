import React from 'react';

// Language markers for the switchers.
//
// The flag emoji (🇺🇸 🇪🇸) are regional-indicator pairs, and Windows ships no
// glyph for them — Segoe UI Emoji falls back to monochrome boxed letters, so
// PC users saw "us" and "es" where phones showed flags. Drawing them as inline
// SVG renders identically everywhere.
//
// zh/sc stay as characters: 繁 and 简 name the script rather than a country,
// and CJK glyphs are present on every platform.

const LABELS = { en: 'English', es: 'Español', zh: '繁體', sc: '简体' };

export default function Flag({ code, size = 21, className = '' }) {
  const h = Math.round((size * 15) / 21);
  const common = {
    width: size,
    height: h,
    viewBox: '0 0 21 15',
    className: `flag ${className}`.trim(),
    role: 'img',
    'aria-label': LABELS[code] || code,
    style: { display: 'block', borderRadius: '2px' },
  };
  // Keeps the white stripes of the US flag from vanishing on a light surface.
  const edge = (
    <rect x="0.35" y="0.35" width="20.3" height="14.3" fill="none"
          stroke="rgba(128,128,128,0.5)" strokeWidth="0.7" rx="1" />
  );

  if (code === 'en') {
    return (
      <svg {...common}>
        <rect width="21" height="15" fill="#fff" rx="1" />
        <g fill="#B22234">
          {[0, 2, 4, 6, 8, 10, 12].map(i => (
            <rect key={i} y={i * (15 / 13)} width="21" height={15 / 13} />
          ))}
        </g>
        <rect width="8.4" height={7 * (15 / 13)} fill="#3C3B6E" />
        {edge}
      </svg>
    );
  }

  if (code === 'es') {
    return (
      <svg {...common}>
        <rect width="21" height="15" fill="#AA151B" rx="1" />
        <rect y="3.75" width="21" height="7.5" fill="#F1BF00" />
        {edge}
      </svg>
    );
  }

  return (
    <span className={`flag flag-text ${className}`.trim()} aria-label={LABELS[code] || code}>
      {code === 'sc' ? '简' : '繁'}
    </span>
  );
}
