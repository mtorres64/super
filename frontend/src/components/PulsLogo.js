import React from 'react';

const PulsLogo = ({ size = 'md', dark = false, variant = 'pill', fullWidth = false }) => {
  const scales = { sm: 0.55, md: 0.8, lg: 1 };
  const scale = scales[size] || scales.md;
  const W = 240, H = 44;
  const textColor = dark ? '#ffffff' : '#0f0f0f';
  const font = "'Exo', sans-serif";

  const svgProps = fullWidth
    ? { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block' } }
    : { viewBox: `0 0 ${W} ${H}`, width: W * scale, height: H * scale, style: { display: 'block', flexShrink: 0 } };

  if (variant === 'text') {
    const TW = 200, TH = 60;
    const textSvgProps = fullWidth
      ? { viewBox: `0 0 ${TW} ${TH}`, width: '100%', style: { display: 'block' } }
      : { viewBox: `0 0 ${TW} ${TH}`, width: TW * scale, height: TH * scale, style: { display: 'block', flexShrink: 0 } };
    return (
      <svg {...textSvgProps} xmlns="http://www.w3.org/2000/svg">
        <text x="100" y="48" fontFamily={font} fontWeight="800" fontSize="54"
          fill="#10b981" textAnchor="middle" letterSpacing="-1">
          PULS
        </text>
      </svg>
    );
  }

  return (
    <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
      {/* Fondo verde para PULS */}
      <rect x="0" y="6" width="63" height="33" rx="4" fill="#10b981" />
      {/* PULS en blanco */}
      <text x="31" y="31" fontFamily={font} fontWeight="900" fontSize="22" fill="#ffffff" textAnchor="middle">
        PULS
      </text>
      {/* market·app a la derecha */}
      <text x="65" y="30" fontFamily={font} fontWeight="300" fontSize="20" fill={textColor}>
        <tspan>market</tspan>
        <tspan fontWeight="900" fill="#10b981">·</tspan>
        <tspan>app</tspan>
      </text>
    </svg>
  );
};

export default PulsLogo;
