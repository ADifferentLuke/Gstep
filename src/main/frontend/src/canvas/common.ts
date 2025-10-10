/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

// Types
export type CellType = 'seed' | 'leaf' | 'stem' | 'root' | string;
export type Cell = { x: number; y: number; type?: CellType; color?: string };

// Backend responses
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

// Constants
export const CANVAS_BG = '#d9e3f0';
export const GRID_COLOR = 'rgba(0,0,0,0.06)';

// Helpers
export const centerOf = (x: number, y: number, cols: number, rows: number, cellW: number, cellH: number) => ({
  cx: (x + 0.5) * cellW,
  cy: (rows - 1 - y + 0.5) * cellH, // invert Y for canvas
});

export const hash2 = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0);

export const defaultColor = '#38bdf8';

export function cellColor(type?: string): string {
  switch ((type || '').toLowerCase()) {
    case 'seed': return '#5b3a1e';
    case 'leaf': return '#22c55e';
    case 'stem': return '#6b8e23'; // olive
    case 'root': return '#f59e0b';
    default: return defaultColor;
  }
}