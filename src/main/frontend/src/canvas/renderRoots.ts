import { centerOf } from './common';

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

export function renderRoots(
  ctx: CanvasRenderingContext2D,
  positions: Array<{x:number;y:number;type?:string}>,
  cols: number, rows: number, cssW: number, cssH: number
) {
  const cellW = cssW / cols, cellH = cssH / rows, minDim = Math.min(cellW, cellH);
  const key = (x:number,y:number)=>`${x},${y}`;
  const rootSet = new Set<string>();
  positions.forEach(p => { if ((p.type||'').toLowerCase()==='root') rootSet.add(key(p.x,p.y)); });
  if (!rootSet.size) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 3;

  const dirs = [{dx:1,dy:0},{dx:0,dy:1}];
  rootSet.forEach(k => {
    const [xs,ys] = k.split(',').map(Number);
    const { cx, cy } = centerOf(xs, ys, cols, rows, cellW, cellH);
    const depth = (rows>1) ? (1 - (ys / (rows-1))) : 0;
    const tubeW = minDim * (0.75 - 0.35 * depth) * 0.55;
    const rootColor = `rgba(245, 158, 11, ${(0.95 - 0.35*depth).toFixed(3)})`;
    ctx.strokeStyle = rootColor;
    ctx.lineWidth = tubeW;

    dirs.forEach(({dx,dy})=>{
      const nx=xs+dx, ny=ys+dy;
      if (!rootSet.has(key(nx,ny))) return;
      const { cx:nxC, cy:nyC } = centerOf(nx, ny, cols, rows, cellW, cellH);
      ctx.beginPath();
      if (dx !== 0) { const midx=(cx+nxC)/2; ctx.moveTo(cx,cy); ctx.quadraticCurveTo(midx,cy,nxC,nyC); }
      else          { const midy=(cy+nyC)/2; ctx.moveTo(cx,cy); ctx.quadraticCurveTo(cx,midy,nxC,nyC); }
      ctx.stroke();
    });

    let deg=0;
    if (rootSet.has(key(xs+1,ys))) deg++;
    if (rootSet.has(key(xs-1,ys))) deg++;
    if (rootSet.has(key(xs,ys+1))) deg++;
    if (rootSet.has(key(xs,ys-1))) deg++;
    if (deg===1) { ctx.beginPath(); ctx.fillStyle=rootColor; ctx.arc(cx,cy,tubeW*0.42,0,Math.PI*2); ctx.fill(); }
  });

  ctx.restore();
}