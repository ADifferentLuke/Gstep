import { centerOf } from './common';

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

export function renderLeaves(
  ctx: CanvasRenderingContext2D,
  positions: Array<{x:number;y:number;type?:string}>,
  cols: number, rows: number, cssW: number, cssH: number
) {
  const cellW=cssW/cols, cellH=cssH/rows, minDim=Math.min(cellW,cellH);
  const leaves = positions.filter(p => (p.type||'').toLowerCase()==='leaf');
  if (!leaves.length) return;

  ctx.save();
  ctx.shadowColor='rgba(0,0,0,0.12)'; ctx.shadowBlur=2;

  const frond = (cx:number, cy:number, tx:number, ty:number) => {
    const inset=0.90;
    const ix=cx+(tx-cx)*inset, iy=cy+(ty-cy)*inset;
    const vx=ix-cx, vy=iy-cy, len=Math.hypot(vx,vy)||1;
    const ux=vx/len, uy=vy/len, px=-uy, py=ux;
    const base=minDim*0.38, half=base*0.5;

    const ax=cx+px*half, ay=cy+py*half;
    const bx=ix, by=iy;
    const cx2=cx-px*half, cy2=cy-py*half;

    const grad=ctx.createLinearGradient(cx,cy,ix,iy);
    grad.addColorStop(0,'#166534'); grad.addColorStop(0.6,'#16a34a'); grad.addColorStop(1,'#86efac');
    ctx.fillStyle=grad;

    ctx.beginPath();
    ctx.moveTo(ax,ay);
    const c1x=cx + ux*(len*0.45) + px*(half*0.55);
    const c1y=cy + uy*(len*0.45) + py*(half*0.55);
    ctx.quadraticCurveTo(c1x,c1y,bx,by);
    ctx.lineTo(cx2,cy2);
    const c2x=cx + ux*(len*0.45) - px*(half*0.55);
    const c2y=cy + uy*(len*0.45) - py*(half*0.55);
    ctx.quadraticCurveTo(c2x,c2y,ax,ay);
    ctx.closePath(); ctx.fill();

    const tipR=Math.max(1.5,minDim*0.07);
    const tipGrad=ctx.createRadialGradient(bx,by,0,bx,by,tipR);
    tipGrad.addColorStop(0,'#bbf7d0'); tipGrad.addColorStop(1,'#16a34a');
    ctx.fillStyle=tipGrad; ctx.beginPath(); ctx.arc(bx,by,tipR,0,Math.PI*2); ctx.fill();
    ctx.lineWidth=Math.max(1,minDim*0.02); ctx.strokeStyle='rgba(22,101,52,0.35)'; ctx.stroke();
  };

  for (const p of leaves) {
    const left=p.x*cellW, right=(p.x+1)*cellW, top=(rows-1-p.y)*cellH, bottom=(rows-p.y)*cellH;
    const { cx, cy } = centerOf(p.x,p.y,cols,rows,cellW,cellH);

    const bodyRx=minDim*0.24, bodyRy=minDim*0.18;
    const bodyGrad=ctx.createLinearGradient(cx-bodyRx,cy,cx+bodyRx,cy);
    bodyGrad.addColorStop(0,'#14532d'); bodyGrad.addColorStop(0.5,'#22c55e'); bodyGrad.addColorStop(1,'#86efac');
    ctx.fillStyle=bodyGrad; ctx.beginPath(); ctx.ellipse(cx,cy,bodyRx,bodyRy,0,0,Math.PI*2); ctx.fill();
    ctx.lineWidth=Math.max(1,minDim*0.025); ctx.strokeStyle='rgba(22,101,52,0.35)'; ctx.stroke();

    frond(cx,cy,left,top); frond(cx,cy,right,top); frond(cx,cy,right,bottom); frond(cx,cy,left,bottom);

    ctx.beginPath();
    ctx.ellipse(cx+bodyRx*0.15, cy-bodyRy*0.35, bodyRx*0.35, bodyRy*0.45, 0, 0, Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fill();
  }

  ctx.restore();
}