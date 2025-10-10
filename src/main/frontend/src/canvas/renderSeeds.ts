import { centerOf, hash2 } from './common';

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

export function renderSeeds(
  ctx: CanvasRenderingContext2D,
  positions: Array<{x:number;y:number;type?:string}>,
  cols: number, rows: number, cssW: number, cssH: number
) {
  const cellW=cssW/cols, cellH=cssH/rows, minDim=Math.min(cellW,cellH);
  const seeds = positions.filter(p => (p.type||'').toLowerCase()==='seed');
  if (!seeds.length) return;

  ctx.save();
  for (const p of seeds) {
    const {cx,cy} = centerOf(p.x,p.y,cols,rows,cellW,cellH);
    const rx=minDim*0.36, ry=minDim*0.28;
    ctx.save();
    const rot=((hash2(p.x,p.y)%21)-10)*(Math.PI/180);
    ctx.translate(cx,cy); ctx.rotate(rot);
    const grad=ctx.createRadialGradient(0,0,ry*0.2,0,0,Math.max(rx,ry));
    grad.addColorStop(0,'#7a4a26'); grad.addColorStop(0.65,'#5b3a1e'); grad.addColorStop(1,'#4a2e19');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2); ctx.fill();
    ctx.lineWidth=Math.max(1,minDim*0.04); ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-rx*0.25,-ry*0.25,rx*0.18,ry*0.12,0,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}