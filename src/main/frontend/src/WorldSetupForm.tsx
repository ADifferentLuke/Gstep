import React, { useEffect, useMemo, useState } from 'react';

const POST_URL = '/genetics/v1.0/world';
const DEFAULTS = { width: 90, height: 90, depth: 90, ticksPerDay: 10 } as const;

type Ecosystem = {
  name: string;
  configuration: Record<string, string | number | boolean>;
};

function slugify(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export default function WorldSetupForm() {
  const [dna, setDna] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ecosystems, setEcosystems] = useState<Ecosystem[]>([]);
  const [selectedName, setSelectedName] = useState<string>('');
  const selectedConfig = useMemo(() => {
    return ecosystems.find(e => e.name === selectedName)?.configuration ?? {};
  }, [ecosystems, selectedName]);
  const [loadingEco, setLoadingEco] = useState<boolean>(true);

  const worldSlug = 'world';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoadingEco(true);
        const res = await fetch('/ecosystems.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ecosystems.json (${res.status})`);
        const data = await res.json();
        const list: Ecosystem[] = Array.isArray(data?.ecosystems) ? data.ecosystems : [];
        if (!cancelled) {
          setEcosystems(list);
          setSelectedName(list[0]?.name ?? '');
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load ecosystems.json');
      } finally {
        if (!cancelled) setLoadingEco(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dna.trim()) return setError('Please paste a DNA string.');
    if (!selectedName || !Object.keys(selectedConfig).length) return setError('Please select a valid ecosystem.');

    const postData = {
      world: worldSlug,
      width: DEFAULTS.width,
      height: DEFAULTS.height,
      depth: DEFAULTS.depth,
      ticksPerDay: DEFAULTS.ticksPerDay,
      zoo: dna,
      properties: selectedConfig,
    };

    try {
      setIsSubmitting(true);
      const res = await fetch(POST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      // Redirect after success
      window.location.assign(`/canvas?world=${encodeURIComponent(worldSlug)}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-pixel-grid relative">
      {/* top sweeping glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 glow-gradient opacity-30 blur-3xl"></div>

      <div className="relative z-10 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          {/* Header / hero */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-8 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
              {/* tiny pixel leaf */}
              <svg className="h-8 w-8 pixel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12c6-8 12-8 16 0-4 8-10 8-16 0Z" fill="url(#g)"/>
                <defs>
                  <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee"/>
                    <stop offset="50%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#fb7185"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="underline-pixel text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow pb-8">
              Genome Stepper
            </h1>
            <p className="mt-3 text-sm text-white/70"> </p>
          </div>

          {/* Card */}
          <div className="card-neon rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10 shadow-xl">
            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Ecosystem */}
                <div>
                  <label htmlFor="properties" className="block text-sm font-medium text-white/90 mb-1">Ecosystem</label>
                  <select
                    id="properties"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/50 px-4 py-2.5 input-fancy"
                    disabled={loadingEco || ecosystems.length === 0}
                  >
                    {ecosystems.map((eco) => (
                      <option key={eco.name} value={eco.name} className="bg-slate-800 text-white">{eco.name}</option>
                    ))}
                  </select>
                  {loadingEco && <p className="text-xs text-white/60 mt-1">Loading ecosystems…</p>}
                  {!loadingEco && ecosystems.length === 0 && (
                    <p className="text-xs text-rose-300 mt-1">No ecosystems found. Ensure /ecosystems.json exists.</p>
                  )}
                </div>

                {/* DNA */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="dna" className="block text-sm font-medium text-white/90 mb-1">DNA</label>
                    <span className="text-xs text-white/60">{dna.length.toLocaleString()} chars</span>
                  </div>
                  <textarea
                    id="dna"
                    value={dna}
                    onChange={(e) => setDna(e.target.value)}
                    placeholder="Paste genome here…"
                    rows={1}
                    className="w-full rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/50 px-4 py-3 font-mono text-xs resize-none input-fancy"
                  />
                </div>


                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-rose-300/40 bg-rose-500/10 text-rose-100 text-sm p-3">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/10 disabled:opacity-60 glow-gradient hover:opacity-90 focus-visible:outline-none ml-auto self-end"
                  >
                    {isSubmitting ? 'Seeding…' : 'Create Organism'}
                  </button>
                  <details className="text-xs text-white/70 w-full">
                    <summary className="cursor-pointer select-none">Selected Configuration</summary>
                    <pre className="mt-2 p-3 bg-black/40 rounded-xl overflow-auto text-[11px] leading-5 text-white/80 ring-1 ring-white/10 max-h-64">{JSON.stringify(selectedConfig, null, 2)}</pre>
                  </details>
                </div>
              </form>
            </div>
          </div>

          {/* Footer hint */}
          <p className="mt-6 text-center text-[11px] text-white/50">Pixels today, forests tomorrow 🌱</p>
        </div>
      </div>
    </div>
  );
}
