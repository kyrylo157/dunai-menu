// Procedural olive/eucalyptus branch for the page background.
// Leaves are placed along a cubic stem; each leaf sways on its own so the branch looks alive.

type Pt = [number, number];

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function tangent(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function leafPath(len: number, w: number) {
  return `M0 0C${len * 0.22} ${-w} ${len * 0.7} ${-w * 1.05} ${len} 0C${len * 0.7} ${w * 1.05} ${len * 0.22} ${w} 0 0Z`;
}

/** Deterministic pseudo-random so the branch looks the same on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

interface BranchOpts {
  id: string;
  seed: number;
  leaves: number;
  /** solid silhouette for blurred shadows */
  flat?: boolean;
}

export function branchSvg({ id, seed, leaves, flat }: BranchOpts): string {
  const r = rng(seed);
  const p0: Pt = [20, 380], p1: Pt = [140, 300], p2: Pt = [260, 150], p3: Pt = [400, 40];
  const stem = `M${p0} C${p1} ${p2} ${p3}`;
  const parts: string[] = [];
  for (let i = 0; i < leaves; i++) {
    const t = 0.08 + (i / (leaves - 1)) * 0.9;
    const [x, y] = bezier(p0, p1, p2, p3, t);
    const a = tangent(p0, p1, p2, p3, t);
    const side = i % 2 === 0 ? -1 : 1;
    const len = (70 - t * 26) * (0.85 + r() * 0.3);
    const angle = a + side * (38 + r() * 18);
    const fill = flat ? 'currentColor' : `url(#${id}-g${i % 3})`;
    const vein = flat ? '' : `<path d="M2 0Q${len * 0.5} ${side * -1.5} ${len * 0.94} 0" stroke="url(#${id}-v)" stroke-width="1.1" fill="none"/>`;
    parts.push(
      `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})"><g class="lf" style="--d:${(-r() * 6).toFixed(2)}s;--s:${(5 + r() * 3).toFixed(2)}s"><path d="${leafPath(len, len * 0.2)}" fill="${fill}"/>${vein}</g></g>`,
    );
  }
  // a tip leaf continuing the stem
  const tipA = tangent(p0, p1, p2, p3, 1);
  parts.push(`<g transform="translate(${p3}) rotate(${tipA.toFixed(1)})"><g class="lf" style="--d:-2s;--s:6s"><path d="${leafPath(48, 10)}" fill="${flat ? 'currentColor' : `url(#${id}-g1)`}"/></g></g>`);

  const defs = flat ? '' : `<defs>
  <linearGradient id="${id}-g0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--leaf-hi)"/><stop offset=".55" stop-color="var(--leaf-mid)"/><stop offset="1" stop-color="var(--leaf-lo)"/></linearGradient>
  <linearGradient id="${id}-g1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--leaf-hi)"/><stop offset=".5" stop-color="var(--leaf-mid)"/><stop offset="1" stop-color="var(--leaf-lo)"/></linearGradient>
  <linearGradient id="${id}-g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--leaf-lo)"/><stop offset=".5" stop-color="var(--leaf-mid)"/><stop offset="1" stop-color="var(--leaf-hi)"/></linearGradient>
  <linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;
  const stemStroke = flat ? 'currentColor' : 'var(--stem)';
  return `<svg viewBox="0 0 460 420" aria-hidden="true" focusable="false">${defs}<path d="${stem}" stroke="${stemStroke}" stroke-width="3" stroke-linecap="round" fill="none"/>${parts.join('')}</svg>`;
}
