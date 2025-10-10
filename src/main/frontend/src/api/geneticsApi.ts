/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

// Centralized, typed API calls for the genetics backend.

export type CellType = 'seed' | 'leaf' | 'stem' | 'root' | string;
export type Cell = { x: number; y: number; type?: CellType; color?: string };

export type StateResponse = {
  totalTicks?: number;
  totalDays?: number;
  currentTick?: number;
  width?: number;
  height?: number;
  cells?: Array<{ x: number; y: number; type?: CellType }>;
  metadata?: Record<string, any>;
  counters?: Record<string, number | string>;
};

export type InspectResponse = {
  terrain?: Record<string, any>;
  cell?: Record<string, any> & { genes?: string[]; organism?: Record<string, any> };
  organism?: Record<string, any>;
  genes?: string[];
};

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function getState(world: string): Promise<StateResponse> {
  return fetchJson<StateResponse>(`/genetics/v1/state/${encodeURIComponent(world)}`);
}

export async function tickWorld(world: string, ticks: number): Promise<{ ok: true } & Record<string, any>> {
  // Endpoint contract TBD — we return body passthrough for now
  const body = await fetchJson<Record<string, any>>(
    `/genetics/v1/tick/${encodeURIComponent(world)}?ticks=${Math.max(1, Number(ticks) || 1)}`
  );
  return { ok: true, ...body };
}

export async function inspectCell(world: string, x: number, y: number): Promise<InspectResponse> {
  return fetchJson<InspectResponse>(
    `/genetics/v1/inspect/${encodeURIComponent(world)}?x=${x}&y=${y}`
  );
}

export async function getFrame(world: string, step: number): Promise<{
  positions?: Array<Cell> | Array<[number, number, string?]>;
  currentTick?: number; tick?: number;
  totalTicks?: number;
  totalDays?: number; day?: number;
  metadata?: Record<string, any>;
  counters?: Record<string, number | string>;
}> {
  return fetchJson(
    `/genetics/v1.0/world/${encodeURIComponent(world)}/frame?step=${step}`
  );
}