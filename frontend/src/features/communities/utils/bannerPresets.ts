/**
 * @file bannerPresets.ts
 * @description Curated collection of sleek, minimal SVG banner presets for community headers.
 * 100% self-contained data URIs: zero external network dependencies, offline-ready.
 * @owner Communities Team
 */

export interface BannerPreset {
  id: string;
  name: string;
  description: string;
  dataUrl: string;
}

// 1. Minimal Grid - Clean dark engineering grid with soft accent glow
const SVG_MINIMAL_GRID = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="grid-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a12" />
      <stop offset="50%" stop-color="#0c111d" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <pattern id="grid-pat" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <circle cx="40" cy="40" r="1" fill="rgba(255,255,255,0.14)" />
    </pattern>
    <radialGradient id="grid-glow" cx="80%" cy="20%" r="55%">
      <stop offset="0%" stop-color="rgba(99,102,241,0.18)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
    <radialGradient id="grid-ambient" cx="20%" cy="90%" r="45%">
      <stop offset="0%" stop-color="rgba(14,165,233,0.12)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid-bg)" />
  <rect width="100%" height="100%" fill="url(#grid-pat)" />
  <rect width="100%" height="100%" fill="url(#grid-glow)" />
  <rect width="100%" height="100%" fill="url(#grid-ambient)" />
</svg>
`.trim();

// 2. Topographic Waves - Minimal contour curves on dark obsidian
const SVG_TOPO_WAVES = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="topo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06080e" />
      <stop offset="100%" stop-color="#0b0f19" />
    </linearGradient>
    <radialGradient id="topo-glow" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="rgba(99,102,241,0.14)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#topo-bg)" />
  <g fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.2">
    <path d="M-100,200 C200,100 400,320 700,210 C1000,100 1100,280 1300,190" />
    <path d="M-100,230 C200,130 400,350 700,240 C1000,130 1100,310 1300,220" />
    <path d="M-100,260 C200,160 400,380 700,270 C1000,160 1100,340 1300,250" />
    <path d="M-100,290 C200,190 400,410 700,300 C1000,190 1100,370 1300,280" />
    <path d="M-100,170 C200,70 400,290 700,180 C1000,70 1100,250 1300,160" />
    <path d="M-100,140 C200,40 400,260 700,150 C1000,40 1100,220 1300,130" />
  </g>
  <rect width="100%" height="100%" fill="url(#topo-glow)" />
</svg>
`.trim();

// 3. Deep Aurora - Sleek atmospheric gradient wash
const SVG_DEEP_AURORA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="aurora-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080a10" />
      <stop offset="50%" stop-color="#0a0f1d" />
      <stop offset="100%" stop-color="#06080d" />
    </linearGradient>
    <radialGradient id="aurora-1" cx="25%" cy="30%" r="50%">
      <stop offset="0%" stop-color="rgba(16,185,129,0.12)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
    <radialGradient id="aurora-2" cx="75%" cy="40%" r="55%">
      <stop offset="0%" stop-color="rgba(99,102,241,0.18)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
    <radialGradient id="aurora-3" cx="50%" cy="100%" r="45%">
      <stop offset="0%" stop-color="rgba(56,189,248,0.1)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#aurora-bg)" />
  <rect width="100%" height="100%" fill="url(#aurora-1)" />
  <rect width="100%" height="100%" fill="url(#aurora-2)" />
  <rect width="100%" height="100%" fill="url(#aurora-3)" />
</svg>
`.trim();

// 4. Geometric Blueprint - Clean diagonal isometric grid
const SVG_BLUEPRINT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="bp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14" />
      <stop offset="100%" stop-color="#0d1424" />
    </linearGradient>
    <pattern id="bp-pat" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 0 30 L 60 30 M 30 0 L 30 60" fill="none" stroke="rgba(14,165,233,0.06)" stroke-width="1" />
      <path d="M 0 0 L 60 60 M 60 0 L 0 60" fill="none" stroke="rgba(14,165,233,0.03)" stroke-width="0.8" />
      <circle cx="30" cy="30" r="1.5" fill="rgba(14,165,233,0.18)" />
    </pattern>
    <radialGradient id="bp-sheen" cx="30%" cy="10%" r="50%">
      <stop offset="0%" stop-color="rgba(14,165,233,0.15)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bp-bg)" />
  <rect width="100%" height="100%" fill="url(#bp-pat)" />
  <rect width="100%" height="100%" fill="url(#bp-sheen)" />
</svg>
`.trim();

// 5. Network Bus - Subtle orthogonal trace pathways
const SVG_NETWORK_BUS = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="bus-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07080d" />
      <stop offset="100%" stop-color="#0c0e17" />
    </linearGradient>
    <radialGradient id="bus-glow" cx="80%" cy="30%" r="60%">
      <stop offset="0%" stop-color="rgba(139,92,246,0.14)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bus-bg)" />
  <g fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.2">
    <path d="M0,120 L300,120 L360,180 L800,180 L860,240 L1200,240" />
    <path d="M0,160 L240,160 L300,220 L680,220 L740,280 L1200,280" />
    <path d="M0,200 L180,200 L240,260 L560,260 L620,320 L1200,320" />
    <circle cx="360" cy="180" r="3" fill="rgba(139,92,246,0.3)" />
    <circle cx="800" cy="180" r="3" fill="rgba(139,92,246,0.3)" />
    <circle cx="300" cy="220" r="3" fill="rgba(99,102,241,0.3)" />
    <circle cx="680" cy="220" r="3" fill="rgba(99,102,241,0.3)" />
  </g>
  <rect width="100%" height="100%" fill="url(#bus-glow)" />
</svg>
`.trim();

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: "minimal-grid",
    name: "Minimal Grid",
    description: "Sleek coordinate grid with subtle ambient corner glow",
    dataUrl: toDataUrl(SVG_MINIMAL_GRID),
  },
  {
    id: "topographic-waves",
    name: "Topographic Waves",
    description: "Serene mathematical contour lines on deep obsidian",
    dataUrl: toDataUrl(SVG_TOPO_WAVES),
  },
  {
    id: "deep-aurora",
    name: "Deep Aurora",
    description: "Atmospheric dark gradient wash with quiet emerald & indigo sheens",
    dataUrl: toDataUrl(SVG_DEEP_AURORA),
  },
  {
    id: "geometric-blueprint",
    name: "Blueprint",
    description: "Fine technical isometric lines with cyan registration points",
    dataUrl: toDataUrl(SVG_BLUEPRINT),
  },
  {
    id: "network-bus",
    name: "Network Bus",
    description: "Clean orthogonal circuit traces suited for CS and engineering",
    dataUrl: toDataUrl(SVG_NETWORK_BUS),
  },
];
