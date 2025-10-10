import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logo from './assets/logo.png';
import { renderGrid } from './canvas/renderGrid';
import { renderRoots } from './canvas/renderRoots';
import { renderStems } from './canvas/renderStems';
import { renderSeeds } from './canvas/renderSeeds';
import { renderLeaves } from './canvas/renderLeaves';
import { renderFallback } from './canvas/renderFallback';

import { useCanvasGeometry } from './hooks/useCanvas';
import { useToast } from './hooks/useToast';
import { getState, tickWorld as apiTickWorld, inspectCell, getFrame } from './api/geneticsApi';
import { CANVAS_BG, defaultColor, cellColor, Cell } from './canvas/common';
/*
sdaf

*/

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

const dbg = (...args: any[]) => console.log('%c[SimulationCanvas]', 'color:#38bdf8', ...args);


export default function SimulationCanvas() {
  const qs = useQuery();
  const world = qs.get('world') || 'world';
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
  const rafIdRef = useRef<number | null>(null);

const { toast, showToast, dismiss } = useToast(60_000);

  const { canvasRef, containerRef, syncCanvasSize, getCellFromEvent } = useCanvasGeometry();

  // cellSize is computed inside draw based on the synced canvas size

  const draw = useCallback((positions: Array<Cell>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, cssW, cssH);

    const c = Math.max(1, cols);
    const r = Math.max(1, rows);

    // Grid layer
    renderGrid(ctx, cssW, cssH, c, r);

    // Domain layers
    renderRoots(ctx, positions as any, c, r, cssW, cssH);
    renderStems(ctx, positions as any, c, r, cssW, cssH);
    renderSeeds(ctx, positions as any, c, r, cssW, cssH);
    renderLeaves(ctx, positions as any, c, r, cssW, cssH);

    // Fallback cells (any unknown type)
    renderFallback(ctx, positions as any, c, r, cssW, cssH, defaultColor);
  }, [cols, rows]);

  const fetchState = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const body = await getState(world);
      dbg('state body', body);
      setStateResponse(body as any);

      if (typeof body?.currentTick === 'number') setTick(body.currentTick);
      if (typeof body?.totalDays === 'number') setDay(body.totalDays);
      if (typeof body?.totalTicks === 'number') setTotalTicks(body.totalTicks);

      const nextCols = Math.max(1, Number(body?.width) || gridSize);
      const nextRows = Math.max(1, Number(body?.height) || gridSize);
      setCols(nextCols);
      setRows(nextRows);

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
      if (/404/.test(m) || /not found/i.test(m)) { window.location.assign('/'); return; }
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
      const body = await apiTickWorld(world, ticks);
      dbg('tick body', body);
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
    if (!Number.isFinite(x) || !Number.isFinite(y)) { showToast('Invalid coordinates'); return; }
    setLoading(true); setErr(null);
    try {
      const body = await inspectCell(world, x, y);
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

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = (typeof cols === 'number' && cols > 0) ? cols : 25;
    const r = (typeof rows === 'number' && rows > 0) ? rows : 25;

    const hit = getCellFromEvent(e, c, r);
    if (!hit) { dbg('No cell under click', { c, r }); return; }

    const xi = Math.max(0, Math.min(c - 1, Math.floor(hit.x)));
    const yi = Math.max(0, Math.min(r - 1, Math.floor(hit.y)));
    dbg('canvas click', { xi, yi, c, r });
    probeCell(xi, yi);
  }, [cols, rows, getCellFromEvent, probeCell]);

  const fetchFrame = useCallback(async (n: number) => {
    setLoading(true); setErr(null);
    try {
      const data = await getFrame(world, n);
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

  // rAF-throttled resize handler to redraw with last state
  useEffect(() => {
    const onResize = () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        syncCanvasSize();
        const positions = Array.isArray(stateResponse?.cells)
          ? (stateResponse.cells as Array<{ x: number; y: number; type?: string }>).map((c) => ({
              x: c.x,
              y: c.y,
              type: c.type,
              color: cellColor(c.type),
            }))
          : [];
        draw(positions);
      });
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [draw, syncCanvasSize, stateResponse]);



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
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[1000] w-[min(90vw,48rem)]">
          <div className="relative rounded-md border border-red-400/40 bg-red-500/20 backdrop-blur text-red-100 text-sm p-3 shadow-xl whitespace-pre-wrap break-words max-h-[60vh] overflow-auto pr-9">
            <div>{toast.msg}</div>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={dismiss}
              className="absolute right-2 top-2 inline-flex items-center justify-center rounded p-1 text-red-700 hover:bg-red-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Logo header */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 mt-4 mb-2">
        <a href="/" aria-label="Home" title="Home">
          <img
            src={logo}
            alt="Gstep Logo"
            className="h-20 w-auto select-none cursor-pointer hover:opacity-90 transition"
          />
        </a>
      </div>
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
