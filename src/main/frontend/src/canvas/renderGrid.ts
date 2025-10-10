/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import { GRID_COLOR } from './common';

export function renderGrid(ctx: CanvasRenderingContext2D, cssW: number, cssH: number, cols: number, rows: number) {
  const cellW = cssW / cols;
  const cellH = cssH / rows;
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let i = 0; i <= cols; i++) {
    const x = Math.floor(i * cellW) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cssH); ctx.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    const y = Math.floor(j * cellH) + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke();
  }
}