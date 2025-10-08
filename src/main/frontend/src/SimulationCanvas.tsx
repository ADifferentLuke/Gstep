import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Page that draws colored squares on a canvas based on positions from the backend.
// URL params:
//   world: string   (e.g. /canvas?world=world)
//   size: number    (optional, canvas pixel size, default 720)
//   grid: number    (optional, number of world cells per side, default 90)
// Expected response (flexible):
// {
//   positions: Array<{x:number,y:number,color?:string}> | Array<[number,number,string?]>,
//   tick?: number, day?: number, totalTicks?: number,
//   metadata?: Record<string, any>, counters?: Record<string, number>
// }

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

const dbg = (...args: any[]) => console.log('%c[WorldSetupForm]', 'color:#38bdf8', ...args);


const defaultColor = '#38bdf8';

const cellColor = (type?: string): string => {
  switch ((type || '').toLowerCase()) {
    case 'seed':
      return '#5b3a1e'; // dark brown for seeds
    case 'leaf':
      return '#22c55e'; // vibrant green
    case 'stem':
      return '#6b8e23'; // changed to olive green
    case 'root':
      return '#f59e0b'; // amber
    // Add more mappings here as new types appear
    default:
      return defaultColor;
  }
};

export default function SimulationCanvas() {
  const qs = useQuery();
  const world = qs.get('world') || 'world';
  const canvasSize = Math.max(200, Math.min(1200, Number(qs.get('size')) || 720));
  const gridSize = Math.max(2, Number(qs.get('grid')) || 90);

  const [stepInput, setStepInput] = useState<string>('1');
  const [tick, setTick] = useState<number>(0);
  const [day, setDay] = useState<number>(0);
  const [totalTicks, setTotalTicks] = useState<number>(0);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [counters, setCounters] = useState<Record<string, number | string>>({});
  const [organism, setOrganism] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [stateResponse, setStateResponse] = useState<any>(null);

  const [cols, setCols] = useState<number>(gridSize);
  const [rows, setRows] = useState<number>(gridSize);

  // Genome state: array of 8-char hex strings
  const [genes, setGenes] = useState<string[]>([]);

  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast({ msg, id: Date.now() });
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Map a mouse event on the canvas to grid cell coordinates (x,y)
  const getCellFromEvent = (evt: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cssX = evt.clientX - rect.left;
    const cssY = evt.clientY - rect.top;
    const c = Math.max(1, cols);
    const r = Math.max(1, rows);
    const cellW = rect.width / c;
    const cellH = rect.height / r;
    if (cellW <= 0 || cellH <= 0) return null;
    const col = Math.floor(cssX / cellW);
    const rowFromTop = Math.floor(cssY / cellH);
    const y = r - 1 - rowFromTop; // invert to match drawing space
    const x = col;
    if (x < 0 || y < 0 || x >= c || y >= r) return null;
    return { x, y };
  };

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    // square that fits inside the container
    const size = Math.floor(Math.min(rect.width, rect.height));
    // set the canvas CSS size
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    // set the internal bitmap size for crisp lines
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
  }, []);

  // cellSize is computed inside draw based on the synced canvas size

  const draw = useCallback((positions: Array<any>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background (lighter canvas)
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#d9e3f0';
    ctx.fillRect(0, 0, cssW, cssH);

    const c = Math.max(1, cols);
    const r = Math.max(1, rows);
    const cellW = cssW / c;
    const cellH = cssH / r;

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= c; i++) {
      const x = Math.floor(i * cellW) + 0.5; // crisp
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cssH); ctx.stroke();
    }
    for (let j = 0; j <= r; j++) {
      const y = Math.floor(j * cellH) + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke();
    }

    // ---------- ROOT TUBES ----------
    const isRoot = (p:any) => (p?.type || '').toLowerCase() === 'root';
    const key = (x:number,y:number) => `${x},${y}`;
    const rootSet = new Set<string>();
    positions.forEach(p => { if (isRoot(p)) rootSet.add(key(p.x, p.y)); });

    if (rootSet.size > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 3;

      const center = (x:number, y:number) => ({
        cx: (x + 0.5) * cellW,
        cy: (r - 1 - y + 0.5) * cellH, // invert Y
      });

      const dirs = [
        {dx: 1, dy: 0}, // E
        {dx: 0, dy: 1}, // N (y+1 is up in matrix terms)
      ];

      // Draw each edge once (E and N only)
      rootSet.forEach(k => {
        const [xs, ys] = k.split(',').map(Number);
        const {cx, cy} = center(xs, ys);

        // Deeper cells (smaller y) appear darker/thinner
        const depthFactor = (r > 1) ? (1 - (ys / (r - 1))) : 0; // 0 near top, 1 deep
        const baseW = Math.min(cellW, cellH) * 0.55;
        const tubeW = baseW * (0.75 - 0.35 * depthFactor); // thinner deeper
        const alpha = 0.95 - 0.35 * depthFactor;           // darker deeper
        const rootColor = `rgba(245, 158, 11, ${alpha.toFixed(3)})`; // #f59e0b with depth alpha

        ctx.strokeStyle = rootColor;
        ctx.lineWidth = tubeW;

        dirs.forEach(({dx, dy}) => {
          const nx = xs + dx, ny = ys + dy;
          if (!rootSet.has(key(nx, ny))) return;
          const {cx: nxC, cy: nyC} = center(nx, ny);

          ctx.beginPath();
          if (dx !== 0) {
            const midx = (cx + nxC) / 2;
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(midx, cy, nxC, nyC);
          } else if (dy !== 0) {
            const midy = (cy + nyC) / 2;
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(cx, midy, nxC, nyC);
          }
          ctx.stroke();
        });

        // Tip cap: degree == 1
        let deg = 0;
        if (rootSet.has(key(xs+1, ys))) deg++;
        if (rootSet.has(key(xs-1, ys))) deg++;
        if (rootSet.has(key(xs, ys+1))) deg++;
        if (rootSet.has(key(xs, ys-1))) deg++;
        if (deg === 1) {
          ctx.beginPath();
          ctx.fillStyle = rootColor;
          ctx.arc(cx, cy, tubeW * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    }

    // ---------- STEM TUBES ----------
    const isStem = (p:any) => (p?.type || '').toLowerCase() === 'stem';
    const typeAt = new Map<string, string>();
    positions.forEach(p => { if (p && typeof p.x === 'number' && typeof p.y === 'number') typeAt.set(`${p.x},${p.y}`, (p.type || '').toLowerCase()); });

    const stemSet = new Set<string>();
    positions.forEach(p => { if (isStem(p)) stemSet.add(`${p.x},${p.y}`); });

    if (stemSet.size > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 2.5;

      const center = (x:number, y:number) => ({
        cx: (x + 0.5) * cellW,
        cy: (r - 1 - y + 0.5) * cellH,
      });

      const dirs = [ {dx:1,dy:0}, {dx:0,dy:1} ]; // draw each edge once (E & N)

      stemSet.forEach(k => {
        const [xs, ys] = k.split(',').map(Number);
        const {cx, cy} = center(xs, ys);

        // Stem width a bit thinner than roots
        const baseW = Math.min(cellW, cellH) * 0.45;
        const tubeW = baseW; // can vary with height if desired
        ctx.strokeStyle = '#9ACD32'; // lighter olive (yellowgreen) stem
        ctx.lineWidth = tubeW;

        dirs.forEach(({dx, dy}) => {
          const nx = xs + dx, ny = ys + dy;
          const neighborType = typeAt.get(`${nx},${ny}`);
          if (!neighborType) return;
          // Stems connect to stems, leaves, or seeds
          if (!(neighborType === 'stem' || neighborType === 'leaf' || neighborType === 'seed')) return;
          // Avoid double-drawing by only drawing to E/N
          const {cx: nxC, cy: nyC} = center(nx, ny);
          ctx.beginPath();
          if (dx !== 0) {
            const midx = (cx + nxC) / 2;
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(midx, cy, nxC, nyC);
          } else if (dy !== 0) {
            const midy = (cy + nyC) / 2;
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(cx, midy, nxC, nyC);
          }
          ctx.stroke();
        });
      });

      ctx.restore();
    }

    // ---------- SEED OVALS ----------
    const isSeed = (p:any) => (p?.type || '').toLowerCase() === 'seed';
    const seeds = positions.filter(isSeed);
    if (seeds.length > 0) {
      ctx.save();
      const minDim = Math.min(cellW, cellH);

      // helper: deterministic small rotation based on cell
      const rotFor = (x:number, y:number) => {
        const h = ((x * 73856093) ^ (y * 19349663)) >>> 0; // simple hash
        return ((h % 21) - 10) * (Math.PI / 180); // -10° .. +10°
      };

      seeds.forEach((p:any) => {
        const x = p.x, y = p.y;
        if (typeof x !== 'number' || typeof y !== 'number') return;
        const cx = (x + 0.5) * cellW;
        const cy = (r - 1 - y + 0.5) * cellH; // invert Y

        const rx = minDim * 0.36; // horizontal radius
        const ry = minDim * 0.28; // vertical radius (slightly squashed)

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotFor(x, y));

        // body gradient (dark brown core to lighter edge)
        const grad = ctx.createRadialGradient(0, 0, ry * 0.2, 0, 0, Math.max(rx, ry));
        grad.addColorStop(0, '#7a4a26');
        grad.addColorStop(0.65, '#5b3a1e');
        grad.addColorStop(1, '#4a2e19');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // subtle outline
        ctx.lineWidth = Math.max(1, minDim * 0.04);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.stroke();

        // highlight
        ctx.beginPath();
        ctx.ellipse(-rx * 0.25, -ry * 0.25, rx * 0.18, ry * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fill();

        ctx.restore();
      });

      ctx.restore();
    }

// ---------- LEAF SHAPES (fuller body + tapered fronds) ----------
const isLeaf = (p:any) => (p?.type || '').toLowerCase() === 'leaf';
const leaves = positions.filter(isLeaf);
if (leaves.length > 0) {
  ctx.save();
  const minDim = Math.min(cellW, cellH);
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 2;

  // draw a single tapered frond from center toward a target point (slightly inset from the corner)
  const drawFrond = (cx:number, cy:number, tx:number, ty:number) => {
    // inset the tip a bit to avoid sharp star-like points
    const insetT = 0.90; // 90% toward the corner (was 0.92)
    const ix = cx + (tx - cx) * insetT;
    const iy = cy + (ty - cy) * insetT;

    const vx = ix - cx; const vy = iy - cy;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len; const uy = vy / len;           // unit dir to tip
    const px = -uy; const py = ux;                       // perpendicular

    const baseW = minDim * 0.38;                         // thicker base for more body
    const half = baseW * 0.5;

    // Build a plump, slightly curved blade shape
    const ax = cx + px * half;
    const ay = cy + py * half;
    const bx = ix; // tip slightly inset from corner
    const by = iy;
    const cx2 = cx - px * half;
    const cy2 = cy - py * half;

    // Gradient from base (darker) to tip (lighter)
    const grad = ctx.createLinearGradient(cx, cy, ix, iy);
    grad.addColorStop(0, '#166534');   // dark base
    grad.addColorStop(0.6, '#16a34a'); // brighter mid
    grad.addColorStop(1, '#86efac');   // light tip
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    // stronger belly bulge using control points at ~45% toward the tip and wider lateral offset
    const c1x = cx + ux * (len * 0.45) + px * (half * 0.55);
    const c1y = cy + uy * (len * 0.45) + py * (half * 0.55);
    ctx.quadraticCurveTo(c1x, c1y, bx, by);
    ctx.lineTo(cx2, cy2);
    const c2x = cx + ux * (len * 0.45) - px * (half * 0.55);
    const c2y = cy + uy * (len * 0.45) - py * (half * 0.55);
    ctx.quadraticCurveTo(c2x, c2y, ax, ay);
    ctx.closePath();
    ctx.fill();

    // Rounded tip cap to soften the point
    const tipR = Math.max(1.5, minDim * 0.07);
    const tipGrad = ctx.createRadialGradient(bx, by, 0, bx, by, tipR);
    tipGrad.addColorStop(0, '#bbf7d0'); // very light green highlight at the tip
    tipGrad.addColorStop(1, '#16a34a'); // blend into main leaf color
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.arc(bx, by, tipR, 0, Math.PI * 2);
    ctx.fill();

    // subtle outline
    ctx.lineWidth = Math.max(1, minDim * 0.02);
    ctx.strokeStyle = 'rgba(22, 101, 52, 0.35)';
    ctx.stroke();
  };

  leaves.forEach((p:any) => {
    const x = p.x, y = p.y;
    if (typeof x !== 'number' || typeof y !== 'number') return;

    // Cell bounds (remember Y is inverted in drawing space)
    const left = x * cellW;
    const right = (x + 1) * cellW;
    const top = (r - 1 - y) * cellH;
    const bottom = (r - y) * cellH;
    const cx = left + cellW * 0.5;
    const cy = top + cellH * 0.5;

    // Central body (lozenge/oval) to give the leaf mass
    const bodyRx = minDim * 0.24;
    const bodyRy = minDim * 0.18;
    const bodyGrad = ctx.createLinearGradient(cx - bodyRx, cy, cx + bodyRx, cy);
    bodyGrad.addColorStop(0, '#14532d'); // darker edge
    bodyGrad.addColorStop(0.5, '#22c55e'); // mid
    bodyGrad.addColorStop(1, '#86efac'); // highlight
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1, minDim * 0.025);
    ctx.strokeStyle = 'rgba(22, 101, 52, 0.35)';
    ctx.stroke();

    // Four fronds toward corners (with inset tips)
    const corners = [
      {tx: left,  ty: top},
      {tx: right, ty: top},
      {tx: right, ty: bottom},
      {tx: left,  ty: bottom},
    ];
    corners.forEach(({tx, ty}) => drawFrond(cx, cy, tx, ty));

    // Soft highlight on the body
    ctx.beginPath();
    ctx.ellipse(cx + bodyRx * 0.15, cy - bodyRy * 0.35, bodyRx * 0.35, bodyRy * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
  });

  ctx.restore();
}
    // ---------- OTHER CELLS AS RECTANGLES ----------
    positions.forEach((p) => {
      const t = (p?.type || '').toLowerCase();
      if (t === 'root' || t === 'stem' || t === 'seed' || t === 'leaf') return; // already custom-rendered
      const x = p.x, y = p.y;
      if (typeof x !== 'number' || typeof y !== 'number') return;
      const px = Math.floor(x * cellW);
      const py = Math.floor((r - 1 - y) * cellH);
      ctx.fillStyle = p.color || defaultColor;
      ctx.fillRect(px, py, Math.ceil(cellW), Math.ceil(cellH));
    });
  }, [cols, rows]);

  const fetchState = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const url = `/genetics/v1/state/${encodeURIComponent(world)}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        if (res.status === 404) {
          window.location.assign('/');
          return;
        }
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      let body: any = null;
      try { body = await res.json(); } catch { body = await res.text(); }
      dbg('state body', body);
      setStateResponse(body);

      // Update counters from state response
      if (typeof body?.currentTick === 'number') setTick(body.currentTick);
      if (typeof body?.totalDays === 'number') setDay(body.totalDays);
      if (typeof body?.totalTicks === 'number') setTotalTicks(body.totalTicks);

      // Use backend-provided grid size (fallback to existing gridSize)
      const nextCols = Math.max(1, Number(body?.width) || gridSize);
      const nextRows = Math.max(1, Number(body?.height) || gridSize);
      setCols(nextCols);
      setRows(nextRows);

      // Map cells -> draw positions
      const positions = Array.isArray(body?.cells)
        ? (body.cells as Array<{x:number;y:number;type?:string}>).map((c) => ({
            x: c.x,
            y: c.y,
            type: c.type,
            color: cellColor(c.type),
          }))
        : [];

      draw(positions);
    } catch (e: any) {
      const m = e?.message || 'Failed to fetch state';
      setErr(m);
      showToast(m);
    } finally {
      setLoading(false);
    }
  }, [world, showToast, draw, gridSize]);

  const tickWorld = useCallback(async (n: number): Promise<boolean> => {
    setLoading(true); setErr(null);
    const ticks = Math.max(1, Number(n) || 1);
    try {
      const url = `/genetics/v1/tick/${encodeURIComponent(world)}?ticks=${ticks}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      let body: any = null;
      try { body = await res.json(); } catch { body = await res.text(); }
      dbg('tick body', body);
      // NOTE: when the endpoint returns simulation state or positions, we can update the canvas here.
      return true;
    } catch (e: any) {
      const m = e?.message || 'Failed to tick world';
      setErr(m);
      showToast(m);
      return false;
    } finally {
      setLoading(false);
    }
  }, [world, showToast]);

  const probeCell = useCallback(async (x: number, y: number) => {
    setLoading(true); setErr(null);
    try {
      // New inspect endpoint (rename if needed later)
      const url = `/genetics/v1/inspect/${encodeURIComponent(world)}?x=${x}&y=${y}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Inspect failed (${res.status})`);
      }
      let body: any = null;
      try { body = await res.json(); } catch { body = await res.text(); }
      dbg('cell inspect', {x, y, body});

      // Terrain → Metadata (humanize UPPER_SNAKE_CASE keys to Title Case) and store coordinates
      if (body && typeof body === 'object' && body.terrain && typeof body.terrain === 'object') {
        const humanized: Record<string, any> = {};
        Object.entries(body.terrain as Record<string, any>).forEach(([k, v]) => {
          const label = k
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
          humanized[label] = v;
        });
        setMetadata(prev => ({ ...prev, ...humanized, x, y }));
      } else {
        // still record coordinates even if no terrain object
        setMetadata(prev => ({ ...prev, x, y }));
      }

      // Cell → Counters (no prefix, do not add coordinates)
      let genesFromCell: string[] | null = null; let organismFromCell: Record<string, any> | null = null;
      if (body && typeof body === 'object' && body.cell && typeof body.cell === 'object') {
        const cellObjRaw = body.cell as Record<string, any>;
        const cellObj: Record<string, any> = { ...cellObjRaw };
        // If the cell object carries a `genes` array, capture it for the Genome panel and remove from counters
        if (Array.isArray(cellObj.genes)) {
          genesFromCell = cellObj.genes as string[];
          delete cellObj.genes;
        }
        if (cellObj.organism && typeof cellObj.organism === 'object') {
          organismFromCell = cellObj.organism as Record<string, any>;
          delete cellObj.organism;
        }
        const merged: Record<string, number | string> = {};
        Object.entries(cellObj).forEach(([k, v]) => {
          merged[k] = (typeof v === 'number' || typeof v === 'string') ? v : JSON.stringify(v);
        });
        setCounters(prev => ({ ...prev, ...merged }));
      }

      // Organism → dedicated state (prefer top-level, else from cell)
      const organismSource = (body && typeof body === 'object' && body.organism && typeof body.organism === 'object')
        ? body.organism as Record<string, any>
        : organismFromCell;
      if (organismSource) {
        const org: Record<string, number | string> = {};
        Object.entries(organismSource).forEach(([k, v]) => {
          org[k] = (typeof v === 'number' || typeof v === 'string') ? v : JSON.stringify(v);
        });
        setOrganism(org);
      } else {
        setOrganism({});
      }

      // Genes → local state (array of 8-char hex strings). Prefer top-level `genes`, else any from cell.
      const geneSource = (body && Array.isArray(body.genes)) ? body.genes : genesFromCell;
      if (geneSource && Array.isArray(geneSource)) {
        const cleaned = geneSource
          .filter((g: any) => typeof g === 'string')
          .map((g: string) => g.trim())
          .filter((g: string) => /^[0-9a-fA-F]{8}$/.test(g))
          .map((g: string) => g.toUpperCase());
        setGenes(cleaned);
      } else {
        setGenes([]);
      }
    } catch (e:any) {
      const m = e?.message || 'Failed to inspect cell';
      setErr(m);
      showToast(m);
    } finally {
      setLoading(false);
    }
  }, [world, showToast]);

  const handleCanvasClick = useCallback((evt: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const cell = getCellFromEvent(evt);
    if (!cell) return;
    probeCell(cell.x, cell.y);
  }, [getCellFromEvent, probeCell]);

  const fetchFrame = useCallback(async (n: number) => {
    setLoading(true); setErr(null);
    try {
      const url = `/genetics/v1.0/world/${encodeURIComponent(world)}/frame?step=${n}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const positions = (data?.positions ?? []) as any[];
      draw(positions);
      if (typeof (data?.currentTick ?? data?.tick) === 'number') setTick(data.currentTick ?? data.tick);
      if (typeof (data?.totalDays ?? data?.day) === 'number') setDay(data.totalDays ?? data.day);
      if (typeof data?.totalTicks === 'number') setTotalTicks(data.totalTicks);
      if (data?.metadata && typeof data.metadata === 'object') setMetadata(data.metadata);
      if (data?.counters && typeof data.counters === 'object') setCounters(data.counters as Record<string, number | string>);
    } catch (e:any) {
      const m = e?.message || 'Failed to fetch frame';
      setErr(m);
      showToast(m);
    } finally {
      setLoading(false);
    }
  }, [draw, world, showToast]);

  // initial blank grid and fetch state
  useEffect(() => {
    syncCanvasSize();
    draw([]);
    fetchState();
  }, [draw, fetchState, syncCanvasSize]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 60000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onResize = () => { syncCanvasSize(); draw([]); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncCanvasSize, draw]);

  // --- Genome helpers ---
  const hexToBytes = (hex: string): number[] | null => {
    if (!/^[0-9A-F]{8}$/.test(hex)) return null;
    return [0,1,2,3].map(i => parseInt(hex.slice(i*2, i*2+2), 16));
  };

  const colorForByte = (v: number): string => {
    // Map 0..255 to a nature-friendly green→yellow scale
    const t = Math.max(0, Math.min(255, v)) / 255; // 0..1
    const hue = 140 - 60 * t;   // 140 (green) → 80 (yellow-green)
    const sat = 70;             // %
    const light = 35 + 30 * t;  // 35% → 65%
    return `hsl(${hue}deg ${sat}% ${light}%)`;
  };

  return (
    <div className="relative min-h-screen w-full overflow-auto bg-pixel-grid bg-pixel-animated text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 glow-gradient opacity-30 blur-3xl"></div>
      <div className="absolute top-4 left-4 z-50">
        <a
          href="/"
          className="glow-gradient inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/10 hover:opacity-90 focus-visible:outline-none"
        >
          ←
        </a>
      </div>
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[1000] w-[min(90vw,48rem)]">
          <div className="relative rounded-md border border-red-400/40 bg-red-500/20 backdrop-blur text-red-100 text-sm p-3 shadow-xl whitespace-pre-wrap break-words max-h-[60vh] overflow-auto pr-9">
            <div>{toast.msg}</div>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setToast(null)}
              className="absolute right-2 top-2 inline-flex items-center justify-center rounded p-1 text-red-700 hover:bg-red-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 p-4 md:p-6 overflow-auto text-white">
        {/* Canvas + controls */}
        <div>
          <div className="relative card-neon rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10 shadow-xl p-4">
            <div ref={containerRef} className="relative w-full" style={{ height: '75vh' }}>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full h-full rounded-xl border border-white/20 bg-black cursor-crosshair"
              />
            </div>
            {/* Footer controls */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="step" className="text-sm font-semibold text-white/80">Ticks</label>
                <input
                  id="step"
                  type="number"
                  min={1}
                  step={1}
                  value={stepInput}
                  onChange={(e)=> setStepInput(e.target.value)}
                  onBlur={(e)=> { const v = e.currentTarget.value; if (v === '' || Number(v) < 1) setStepInput('1'); }}
                  className="w-24 input-fancy px-2 py-1 text-sm"
                />
                <button
                  onClick={async ()=> { const n = Math.max(1, Number(stepInput) || 1); const ok = await tickWorld(n); if (ok) { await fetchState(); } }}
                  disabled={loading}
                  className="glow-gradient inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/10 hover:opacity-90 disabled:opacity-60 focus-visible:outline-none"
                >
                  {loading ? 'Ticking…' : 'Tick Clock'}
                </button>
              </div>

              <div className="ml-auto grid grid-cols-3 gap-4 text-sm">
                <div><span className="label-muted">Ticks:</span> <span className="font-medium">{totalTicks}</span></div>
                <div><span className="label-muted">Days:</span> <span className="font-medium">{day}</span></div>
                <div><span className="label-muted">Tick:</span> <span className="font-medium">{tick}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="relative card-neon rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10 shadow-xl p-4">
            <h2 className="text-base font-semibold mb-2">Terrain</h2>
            <div className="h-px w-full bg-white/10 mb-3" />
            {Object.keys(metadata).length === 0 && <p className="text-sm label-muted">—</p>}
            <dl className="space-y-1 text-sm">
              {metadata.x !== undefined && metadata.y !== undefined && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="label-muted truncate">Coordinates</dt>
                  <dd className="font-medium break-words">({String(metadata.x)},{String(metadata.y)})</dd>
                </div>
              )}
              {Object.entries(metadata)
                .filter(([k]) => k !== 'x' && k !== 'y')
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-2">
                    <dt className="label-muted truncate">{k}</dt>
                    <dd className="font-medium break-words">{String(v)}</dd>
                  </div>
                ))}
            </dl>
          </div>

          <div className="relative card-neon rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10 shadow-xl p-4">
            <h2 className="text-base font-semibold mb-2">Biology</h2>
            <div className="h-px w-full bg-white/10 mb-3" />
            <h3 className="text-sm font-semibold text-white/80 mb-2 text-center">Cell</h3>
            {Object.keys(counters).length === 0 && <p className="text-sm label-muted">—</p>}
            <ul className="space-y-1 text-sm">
              {Object.entries(counters).map(([k, v]) => {
                const pretty = k
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (c) => c.toUpperCase());
                return (
                  <li key={k} className="flex items-center justify-between">
                    <span className="label-muted truncate">{pretty}</span>
                    <span className="font-medium break-words text-right">{String(v)}</span>
                  </li>
                );
              })}
            </ul>
            {/* Organism */}
            <div className="h-px w-full bg-white/10 my-3" />
            <h3 className="text-sm font-semibold text-white/80 mb-2 text-center">Organism</h3>
            {Object.keys(organism).length === 0 && <p className="text-sm label-muted">—</p>}
            <ul className="space-y-1 text-sm">
              {Object.entries(organism).map(([k, v]) => {
                const pretty = k
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (c) => c.toUpperCase());
                return (
                  <li key={k} className="flex items-center justify-between">
                    <span className="label-muted truncate">{pretty}</span>
                    <span className="font-medium break-words text-right">{String(v)}</span>
                  </li>
                );
              })}
            </ul>
            {/* Genome */}
            <div className="h-px w-full bg-white/10 my-3" />
            <h3 className="text-sm font-semibold text-white/80 mb-2">Genome</h3>
            {genes.length === 0 ? (
              <p className="text-sm label-muted">—</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs label-muted">
                  <span>Genes: {genes.length}</span>
                  <span>Total Size: {genes.length * 4} bytes</span>
                </div>
                <div className="max-h-48 overflow-auto rounded-md ring-1 ring-white/10 p-2 bg-white/5">
                  <ul className="space-y-1">
                    {genes.map((g, idx) => {
                      const bytes = hexToBytes(g);
                      return (
                        <li key={idx} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                          {/* Mini byte bars */}
                          <div className="flex items-center gap-0.5">
                            {bytes ? bytes.map((b, i) => (
                              <span
                                key={i}
                                title={`Byte ${i}: ${b}`}
                                className="inline-block h-3 w-3 rounded-sm border border-white/20"
                                style={{ backgroundColor: colorForByte(b) }}
                              />
                            )) : null}
                          </div>
                          {/* Hex text, grouped */}
                          <code className="font-mono text-white/90 truncate">{g.slice(0,2)} {g.slice(2,4)} {g.slice(4,6)} {g.slice(6,8)}</code>
                          {/* Copy button */}
                          <button
                            type="button"
                            className="justify-self-end text-[10px] px-2 py-0.5 rounded border border-white/15 hover:bg-white/10"
                            onClick={() => { navigator.clipboard?.writeText(g).then(() => showToast(`Copied ${g}`)); }}
                            aria-label={`Copy ${g}`}
                          >Copy</button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
