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

export default function SimulationCanvas() {
  const qs = useQuery();
  const world = qs.get('world') || 'world';
  const canvasSize = Math.max(200, Math.min(1200, Number(qs.get('size')) || 720));
  const gridSize = Math.max(2, Number(qs.get('grid')) || 90);

  const [step, setStep] = useState<number>(1);
  const [tick, setTick] = useState<number>(0);
  const [day, setDay] = useState<number>(0);
  const [totalTicks, setTotalTicks] = useState<number>(0);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [stateResponse, setStateResponse] = useState<any>(null);

  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast({ msg, id: Date.now() });
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

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
    // Work in CSS pixels while rendering on a DPR-scaled canvas
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    // Reset transform and scale for crisp 1px lines
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // clear + background
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, cssW, cssH);

    // compute cell size from actual canvas size
    const cellSize = cssW / gridSize;

    // faint grid (aligned to half-pixels for sharpness)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      const p = Math.floor(i * cellSize) + 0.5;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, cssH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(cssW, p); ctx.stroke();
    }

    // draw squares
    positions.forEach((p) => {
      let x:number, y:number, color:string|undefined;
      if (Array.isArray(p)) { [x, y, color] = p as [number, number, (string|undefined)]; }
      else { x = p.x; y = p.y; color = p.color; }
      if (typeof x !== 'number' || typeof y !== 'number') return;
      const px = Math.floor(x * cellSize);
      const py = Math.floor((gridSize - 1 - y) * cellSize); // invert y so 0 is bottom
      ctx.fillStyle = color || defaultColor;
      ctx.fillRect(px, py, Math.ceil(cellSize), Math.ceil(cellSize));
    });
  }, [gridSize]);

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
      dbg(body);
      //setStateResponse(body);
      // NOTE: when your endpoint starts returning positions, you can call draw(body.positions)
    } catch (e: any) {
      const m = e?.message || 'Failed to fetch state';
      setErr(m);
      showToast(m);
    } finally {
      setLoading(false);
    }
  }, [world, showToast]);

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
      if (typeof data?.tick === 'number') setTick(data.tick);
      if (typeof data?.day === 'number') setDay(data.day);
      if (typeof data?.totalTicks === 'number') setTotalTicks(data.totalTicks);
      if (data?.metadata && typeof data.metadata === 'object') setMetadata(data.metadata);
      if (data?.counters && typeof data.counters === 'object') setCounters(data.counters);
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
                className="w-full h-full rounded-xl border border-white/20 bg-black"
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
                  value={step}
                  onChange={(e)=> setStep(Math.max(1, Number(e.target.value)||1))}
                  className="w-24 input-fancy px-2 py-1 text-sm"
                />
                <button
                  onClick={()=> fetchState()}
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
            <h2 className="text-base font-semibold mb-2">Metadata</h2>
            {Object.keys(metadata).length === 0 && <p className="text-sm label-muted">—</p>}
            <dl className="space-y-1 text-sm">
              {Object.entries(metadata).map(([k,v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="label-muted truncate">{k}</dt>
                  <dd className="font-medium break-words">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative card-neon rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10 shadow-xl p-4">
            <h2 className="text-base font-semibold mb-2">Counters</h2>
            {Object.keys(counters).length === 0 && <p className="text-sm label-muted">—</p>}
            <ul className="space-y-1 text-sm">
              {Object.entries(counters).map(([k,v]) => (
                <li key={k} className="flex items-center justify-between"><span className="label-muted">{k}</span><span className="font-medium">{v}</span></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
