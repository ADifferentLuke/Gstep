import { centerOf } from './common';

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

export function renderStems(
  ctx: CanvasRenderingContext2D,
  positions: Array<{x:number;y:number;type?:string}>,
  cols: number, rows: number, cssW: number, cssH: number
) {
  const cellW=cssW/cols, cellH=cssH/rows, minDim=Math.min(cellW,cellH);
  const key = (x:number,y:number)=>`${x},${y}`;
  const typeAt = new Map<string,string>();
  positions.forEach(p=>{ typeAt.set(key(p.x,p.y), (p.type||'').toLowerCase()); });

  const stems = positions.filter(p => (p.type||'').toLowerCase()==='stem');
  if (!stems.length) return;

  ctx.save();
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.shadowColor='rgba(0,0,0,0.15)'; ctx.shadowBlur=2.5;
  ctx.strokeStyle='#9ACD32'; // olive/yellowgreen
  ctx.lineWidth=minDim*0.45;

  const dirs=[{dx:1,dy:0},{dx:0,dy:1}];
  for (const p of stems) {
    const {cx,cy} = centerOf(p.x,p.y,cols,rows,cellW,cellH);
    for (const {dx,dy} of dirs) {
      const nx=p.x+dx, ny=p.y+dy;
      const nt = typeAt.get(key(nx,ny));
      if (!nt || (nt!=='stem' && nt!=='leaf' && nt!=='seed')) continue;
      const {cx:nxC,cy:nyC} = centerOf(nx,ny,cols,rows,cellW,cellH);
      ctx.beginPath();
      if (dx!==0) { const mid=(cx+nxC)/2; ctx.moveTo(cx,cy); ctx.quadraticCurveTo(mid,cy,nxC,nyC); }
      else        { const mid=(cy+nyC)/2; ctx.moveTo(cx,cy); ctx.quadraticCurveTo(cx,mid,nxC,nyC); }
      ctx.stroke();
    }
  }
  ctx.restore();
}