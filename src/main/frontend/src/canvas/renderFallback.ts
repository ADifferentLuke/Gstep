/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

export function renderFallback(
  ctx: CanvasRenderingContext2D,
  positions: Array<{x:number;y:number;type?:string;color?:string}>,
  cols: number, rows: number, cssW: number, cssH: number,
  defaultColor: string
) {
  const cellW=cssW/cols, cellH=cssH/rows;
  for (const p of positions) {
    const t=(p.type||'').toLowerCase();
    if (t==='root'||t==='stem'||t==='seed'||t==='leaf') continue;
    const px=Math.floor(p.x*cellW), py=Math.floor((rows-1-p.y)*cellH);
    ctx.fillStyle = p.color || defaultColor;
    ctx.fillRect(px, py, Math.ceil(cellW), Math.ceil(cellH));
  }
}