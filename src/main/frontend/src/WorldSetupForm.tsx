import React, { useEffect, useMemo, useState } from 'react';
import logo from './assets/logo.png';

const dbg = (...args: any[]) => console.log('%c[WorldSetupForm]', 'color:#38bdf8', ...args);

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
  useEffect(() => {
    dbg('mounted');
  }, []);

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
        dbg('loading ecosystems.json');
        setLoadingEco(true);
        const res = await fetch('/ecosystems.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ecosystems.json (${res.status})`);
        const data = await res.json();
        const list: Ecosystem[] = Array.isArray(data?.ecosystems) ? data.ecosystems : [];
        dbg('ecosystems loaded', list.map(e => e.name));
        if (!cancelled) {
          setEcosystems(list);
          setSelectedName(list[0]?.name ?? '');
        }
      } catch (err: any) {
        dbg('failed to load ecosystems.json', err);
        if (!cancelled) setError(err?.message || 'Failed to load ecosystems.json');
      } finally {
        dbg('load ecosystems done');
        if (!cancelled) setLoadingEco(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    dbg('submit clicked', { dnaLen: dna.length, selectedName });
    if (!dna.trim()) return setError('Please paste a DNA string.');
    if (!selectedName || !Object.keys(selectedConfig).length) return setError('Please select a valid ecosystem.');

    const postData = {
      organism: dna,
      properties: selectedConfig,
    };
    dbg('postData', postData);

    try {
      setIsSubmitting(true);
      const res = await fetch(POST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      dbg('response status', res.status);
      if (!res.ok) {
        const text = await res.text();
        dbg('error body', text);
        throw new Error(text || `Request failed (${res.status})`);
      }
      let body: any = null;
      try {
        body = await res.json();
      } catch (_) {
        body = await res.text();
      }
      dbg('success body', body);
      const worldId = (body && (body.id || body.world || body.uuid)) || 'world';
      dbg('world id', body.id);
      window.location.assign(`/canvas?world=${body.id}`);
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

      <div className="relative z-10 flex items-center justify-center px-6 py-1">
        <div className="w-full max-w-4xl">
          {/* Header / hero */}
          <div className="mb-1 text-center">
            {/* Oversized, eye-catching logo with soft glow */}
            <div className="relative mx-auto my-6 w-[220px] sm:w-[280px] md:w-[340px] lg:w-[400px]">
              <div className="absolute inset-0 rounded-full bg-black/40 blur-3xl opacity-20" aria-hidden />
              <img
                src={logo}
                alt="Gstep"
                className="relative z-10 w-full h-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
              />
            </div>
            <div className="mx-auto mt-[2px] h-[4px] w-40 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-pink-500 opacity-95" />
          </div>

          {/* Card with animation */}
          <div className="transition-transform duration-300 hover:scale-[1.01]">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/10 shadow-2xl transition-all hover:ring-cyan-400/20">
              <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-8">
                  {/* Ecosystem */}
                  <div>
                    <label htmlFor="properties" className="block text-base font-semibold text-white/90 mb-2.5">Ecosystem</label>
                    <select
                      id="properties"
                      value={selectedName}
                      onChange={(e) => setSelectedName(e.target.value)}
                      className="w-full h-12 rounded-xl border border-white/15 bg-white/10 text-white placeholder-white/60 px-4 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/50 transition-all"
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
                    <div className="flex items-baseline justify-between mb-2.5">
                      <label htmlFor="dna" className="block text-base font-semibold text-white/90">DNA</label>
                      <span className="text-xs text-white/60">{dna.length.toLocaleString()} chars</span>
                    </div>
                    <input
                      id="dna"
                      type="text"
                      value={dna}
                      onChange={(e) => setDna(e.target.value)}
                      placeholder="Paste genome here…"
                      className="w-full h-12 rounded-xl border border-white/15 bg-white/10 text-white placeholder-white/60 px-4 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/50 transition-all font-mono text-sm"
                    />
                  </div>

                  {/* Error */}
                  <div aria-live="polite">
                    {error ? (
                      <div role="alert" className="rounded-xl border border-rose-300/40 bg-rose-500/15 text-rose-100 text-sm p-3">
                        {error}
                      </div>
                    ) : (
                      <div className="h-0" aria-hidden />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center rounded-2xl px-6 h-12 text-sm font-semibold text-white shadow-lg shadow-black/20 bg-gradient-to-r from-cyan-500 to-pink-500 hover:shadow-xl hover:from-cyan-400 hover:to-pink-400 focus-visible:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-60 ml-auto"
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
          </div>

          {/* Footer hint */}
          <p className="mt-10 text-center text-[12px] text-white/60 italic tracking-wide">
            Pixels today, forests tomorrow 🌱
          </p>
        </div>
      </div>
    </div>
  );
}
