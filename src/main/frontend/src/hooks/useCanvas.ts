import { useCallback, useRef } from 'react';

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

export function useCanvasGeometry() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height)); // square fit
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
  }, []);

  const getCellFromEvent = useCallback(
    (evt: React.MouseEvent<HTMLCanvasElement, MouseEvent>, cols: number, rows: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cssX = evt.clientX - rect.left;
      const cssY = evt.clientY - rect.top;
      const c = Math.max(1, cols);
      const r = Math.max(1, rows);
      const cellW = rect.width / c;
      const cellH = rect.height / r;
      if (cellW <= 0 || cellH <= 0) return null;
      const col = Math.floor(cssX / cellW);
      const rowFromTop = Math.floor(cssY / cellH);
      const y = r - 1 - rowFromTop; // invert to drawing space
      const x = col;
      if (x < 0 || y < 0 || x >= c || y >= r) return null;
      return { x, y };
    },
    []
  );

  return { canvasRef, containerRef, syncCanvasSize, getCellFromEvent };
}