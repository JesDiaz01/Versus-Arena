// src/VLogo.jsx
// The gold "V" brand mark, extracted from the splash screen so it can be reused
// (e.g. on the auth card) without duplicating the SVG. Gradient IDs are prefixed
// "vl-" so they never collide with the splash's inline copy if both ever render.
// Presentational only; size/positioning come from the passed className.
export default function VLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="vl-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D76E" />
          <stop offset="30%" stopColor="#D4A017" />
          <stop offset="60%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        <linearGradient id="vl-shine" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id="vl-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8A84B" />
          <stop offset="50%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#C8A84B" />
        </linearGradient>
      </defs>

      <path
        d="M20 20 L150 240 L280 20 L240 20 L150 185 L60 20 Z"
        fill="url(#vl-rim)"
        stroke="#6B5010"
        strokeWidth="2"
      />
      <path d="M30 28 L150 232 L270 28 L234 28 L150 196 L66 28 Z" fill="url(#vl-gold)" />
      <path d="M30 28 L150 232 L270 28 L234 28 L150 196 L66 28 Z" fill="url(#vl-shine)" />

      <line x1="185" y1="80" x2="200" y2="160" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="192" y1="75" x2="205" y2="130" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
