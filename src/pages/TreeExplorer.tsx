import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { symbol, type Cell } from '../lib/game.ts';
import { useLang } from '../i18n.tsx';
import {
  boardOf,
  buildGameTree,
  lowerBound,
  pathTo,
  RESULT_DRAW,
  RESULT_O,
  RESULT_X,
  type GameTree,
} from '../lib/tree.ts';

// ---------------------------------------------------------------------------
// Layout + view model
//   World x is measured in "leaf units" (see tree.ts). The view maps world x to
//   screen x with  sx = (x - ox) * s.  Zoom is horizontal only: the 10 depth
//   levels always fit the canvas height, which keeps the whole tree readable.
// ---------------------------------------------------------------------------

const BOARD_MIN = 15; // below this on-screen size a node is drawn as a block
const SIDE_MARGIN = 40;

let cachedTree: GameTree | null = null;
const getTree = () => (cachedTree ??= buildGameTree());

interface View { ox: number; s: number }
interface Colors { bg: string; surface: string; surface2: string; border: string; text: string; muted: string; x: string; o: string; draw: string; accent: string }

function readColors(): Colors {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    bg: v('--bg'), surface: v('--surface'), surface2: v('--surface-2'), border: v('--border'), text: v('--text'),
    muted: v('--muted'), x: v('--x'), o: v('--o'), draw: v('--draw'), accent: v('--accent'),
  };
}

const valueColor = (c: Colors, v: number) => (v > 0 ? c.x : v < 0 ? c.o : c.draw);

/** Vertical layout of the 10 depth rows; paddings shrink on short screens (e.g. phones in landscape). */
function levelGeometry(h: number) {
  const short = h < 520;
  const top = short ? 62 : 92; // room for the toolbar overlay
  const bottom = short ? 40 : 64; // room for the legend
  const gap = Math.max(8, (h - top - bottom) / 9);
  const maxBoard = Math.max(10, Math.min(gap * 0.62, 64));
  return { top, gap, maxBoard, rowY: (d: number) => top + d * gap };
}

/** On-screen size a node may use without overlapping its neighbours. */
function nodeSize(t: GameTree, level: Int32Array, i: number, s: number, maxBoard: number) {
  const xi = t.x[level[i]];
  let g = Infinity;
  if (i > 0) g = xi - t.x[level[i - 1]];
  if (i < level.length - 1) g = Math.min(g, t.x[level[i + 1]] - xi);
  return Math.min(maxBoard, g * s * 0.82);
}

/** Clip a segment to a horizontal window so huge off-screen coordinates never reach the canvas. */
function clipSeg(x1: number, y1: number, x2: number, y2: number, lo: number, hi: number) {
  if ((x1 < lo && x2 < lo) || (x1 > hi && x2 > hi)) return null;
  const at = (xx: number) => y1 + ((y2 - y1) * (xx - x1)) / (x2 - x1);
  if (x1 < lo) { y1 = at(lo); x1 = lo; } else if (x1 > hi) { y1 = at(hi); x1 = hi; }
  if (x2 < lo) { y2 = at(lo); x2 = lo; } else if (x2 > hi) { y2 = at(hi); x2 = hi; }
  return [x1, y1, x2, y2] as const;
}

function drawMiniBoard(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number,
  board: Cell[], last: number, c: Colors, ring: string, terminal: boolean,
) {
  const x0 = cx - size / 2;
  const y0 = cy - size / 2;
  const r = Math.max(2, size * 0.12);
  ctx.beginPath();
  ctx.roundRect(x0, y0, size, size, r);
  ctx.fillStyle = c.surface;
  ctx.fill();
  ctx.lineWidth = terminal ? 2.5 : 1.5;
  ctx.strokeStyle = ring;
  ctx.stroke();

  const pad = size * 0.1;
  const cell = (size - pad * 2) / 3;
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.border;
  ctx.beginPath();
  for (let k = 1; k < 3; k++) {
    ctx.moveTo(x0 + pad + k * cell, y0 + pad);
    ctx.lineTo(x0 + pad + k * cell, y0 + size - pad);
    ctx.moveTo(x0 + pad, y0 + pad + k * cell);
    ctx.lineTo(x0 + size - pad, y0 + pad + k * cell);
  }
  ctx.stroke();

  ctx.lineWidth = Math.max(1, cell * 0.14);
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    if (!board[i]) continue;
    const mx = x0 + pad + (i % 3) * cell + cell / 2;
    const my = y0 + pad + Math.floor(i / 3) * cell + cell / 2;
    const q = cell * 0.28;
    if (i === last) {
      ctx.fillStyle = c.surface2;
      ctx.fillRect(mx - cell / 2 + 0.5, my - cell / 2 + 0.5, cell - 1, cell - 1);
    }
    ctx.strokeStyle = board[i] === 1 ? c.x : c.o;
    ctx.beginPath();
    if (board[i] === 1) {
      ctx.moveTo(mx - q, my - q); ctx.lineTo(mx + q, my + q);
      ctx.moveTo(mx + q, my - q); ctx.lineTo(mx - q, my + q);
    } else {
      ctx.arc(mx, my, q * 1.1, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------

export default function TreeExplorer() {
  const { t } = useLang();
  const [tree, setTree] = useState<GameTree | null>(cachedTree);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ ox: 0, s: 1 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const colorsRef = useRef<Colors | null>(null);
  const selectedRef = useRef<number>(-1);
  const frameRef = useRef(0);
  const animRef = useRef(0);

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState(-1);
  const [hover, setHover] = useState<{ id: number; x: number; y: number } | null>(null);

  // Build the tree after the first paint so the loading text can show.
  useEffect(() => {
    if (tree) return;
    const id = setTimeout(() => setTree(getTree()), 30);
    return () => clearTimeout(id);
  }, [tree]);

  // ------------------------------------------------------------------ draw
  const draw = useCallback(() => {
    frameRef.current = 0;
    const started = performance.now();
    const t = tree;
    const canvas = canvasRef.current;
    if (!t || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    const c = (colorsRef.current ??= readColors());
    const { ox, s } = viewRef.current;
    const { maxBoard, rowY } = levelGeometry(h);
    const sel = selectedRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);

    // faint level guides
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    for (let d = 0; d <= 9; d++) { ctx.moveTo(0, rowY(d) + 0.5); ctx.lineTo(w, rowY(d) + 0.5); }
    ctx.stroke();
    ctx.setLineDash([]);

    const margin = maxBoard;
    const sxOf = (id: number) => (t.x[id] - ox) * s;
    type Big = { id: number; sx: number; size: number };
    const bigs: Big[] = [];

    for (let d = 0; d <= 9; d++) {
      const level = t.levels[d];
      const y = rowY(d);
      const edges = new Path2D();
      const blocks = [new Path2D(), new Path2D(), new Path2D()]; // X win, O win, draw
      let i = lowerBound(t, level, ox - margin / s);
      let lastPx = -Infinity;
      let edgeCount = 0;
      while (i < level.length) {
        const id = level[i];
        const sx = sxOf(id);
        if (sx > w + margin) break;
        const size = nodeSize(t, level, i, s, maxBoard);
        const px = Math.floor(sx);
        if (size < 1.5 && px === lastPx) {
          // many nodes share this pixel column: jump to the next column
          const j = lowerBound(t, level, ox + (px + 1) / s);
          i = j > i ? j : i + 1;
          continue;
        }
        lastPx = px;

        if (d > 0) {
          const p = t.parent[id];
          const seg = clipSeg(sxOf(p), rowY(d - 1), sx, y, -50, w + 50);
          if (seg) { edges.moveTo(seg[0], seg[1]); edges.lineTo(seg[2], seg[3]); edgeCount++; }
        }

        if (size >= BOARD_MIN) {
          bigs.push({ id, sx, size });
        } else {
          const v = t.value[id];
          const k = v > 0 ? 0 : v < 0 ? 1 : 2;
          const bw = Math.max(1, size);
          const bh = Math.max(4, Math.min(size, 10));
          blocks[k].rect(sx - bw / 2, y - bh / 2, bw, bh);
        }
        i++;
      }

      // thin out the edge "hair" when a level is very dense
      ctx.globalAlpha = edgeCount > 400 ? 0.1 : edgeCount > 120 ? 0.2 : 0.4;
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 1;
      ctx.stroke(edges);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = c.x; ctx.fill(blocks[0]);
      ctx.fillStyle = c.o; ctx.fill(blocks[1]);
      ctx.fillStyle = c.draw; ctx.fill(blocks[2]);
      ctx.globalAlpha = 1;
    }

    // selected path: thick accent line from the root down to the selection
    const path = sel >= 0 ? pathTo(t, sel) : [];
    if (path.length) {
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 1; k < path.length; k++) {
        const seg = clipSeg(sxOf(path[k - 1]), rowY(k - 1), sxOf(path[k]), rowY(k), -50, w + 50);
        if (seg) { ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]); }
      }
      ctx.stroke();
    }
    const onPath = new Set(path);

    for (const b of bigs) {
      const d = t.depth[b.id];
      drawMiniBoard(ctx, b.sx, rowY(d), b.size, boardOf(t, b.id), t.move[b.id], c,
        valueColor(c, t.value[b.id]), t.result[b.id] !== 0);
    }

    // rings on path nodes (drawn last so they sit on top)
    ctx.strokeStyle = c.accent;
    for (const id of onPath) {
      const sx = sxOf(id);
      if (sx < -margin || sx > w + margin) continue;
      const d = t.depth[id];
      const size = nodeSize(t, t.levels[d], t.levelIndex[id], s, maxBoard);
      const r = Math.max(size, 8) / 2 + 4;
      ctx.lineWidth = id === sel ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(sx - r, rowY(d) - r, r * 2, r * 2, Math.max(4, r * 0.3));
      ctx.stroke();
    }

    // dev-only frame-cost probe (a 120 Hz display gives ~8.3 ms per frame)
    if (import.meta.env.DEV) {
      const ms = performance.now() - started;
      const probe = ((window as unknown as { __treeDraw?: { last: number; max: number; frames: number } }).__treeDraw ??= { last: 0, max: 0, frames: 0 });
      probe.last = ms;
      probe.max = Math.max(probe.max, ms);
      probe.frames++;
    }
  }, [tree]);

  const requestDraw = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // ------------------------------------------------------------- view math
  const limits = useCallback(() => {
    const t = tree!;
    const { w, h } = sizeRef.current;
    const { maxBoard } = levelGeometry(h);
    return { sMin: (w - SIDE_MARGIN * 2) / t.leafCount, sMax: (maxBoard / 0.82) * 1.4, w };
  }, [tree]);

  const clampView = useCallback((v: View): View => {
    const t = tree!;
    const { sMin, sMax, w } = limits();
    const s = Math.min(sMax, Math.max(sMin, v.s));
    const minOx = -SIDE_MARGIN / s - (w * 0.5) / s;
    const maxOx = t.leafCount - 1 + SIDE_MARGIN / s - (w * 0.5) / s;
    return { s, ox: Math.min(maxOx, Math.max(minOx, v.ox)) };
  }, [tree, limits]);

  const setView = useCallback((v: View) => {
    viewRef.current = clampView(v);
    requestDraw();
  }, [clampView, requestDraw]);

  const zoomAt = useCallback((factor: number, sx: number) => {
    const { ox, s } = viewRef.current;
    const wx = ox + sx / s;
    const { sMin, sMax } = limits();
    const ns = Math.min(sMax, Math.max(sMin, s * factor));
    setView({ s: ns, ox: wx - sx / ns });
  }, [limits, setView]);

  const animateTo = useCallback((target: View, ms = 450) => {
    cancelAnimationFrame(animRef.current);
    const from = { ...viewRef.current };
    const to = clampView(target);
    const { w } = sizeRef.current;
    // interpolate the world point at screen centre and log-scale
    const cFrom = from.ox + w / 2 / from.s;
    const cTo = to.ox + w / 2 / to.s;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const s = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e);
      const cx = cFrom + (cTo - cFrom) * e;
      viewRef.current = clampView({ s, ox: cx - w / 2 / s });
      draw();
      if (k < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, [clampView, draw]);

  const fit = useCallback(() => {
    const t = tree!;
    const { w } = sizeRef.current;
    const s = (w - SIDE_MARGIN * 2) / t.leafCount;
    animateTo({ s, ox: -SIDE_MARGIN / s });
  }, [tree, animateTo]);

  const flyTo = useCallback((id: number) => {
    const t = tree!;
    const { w, h } = sizeRef.current;
    const { maxBoard } = levelGeometry(h);
    const d = t.depth[id];
    const level = t.levels[d];
    const i = t.levelIndex[id];
    let gap = Infinity;
    if (i > 0) gap = t.x[id] - t.x[level[i - 1]];
    if (i < level.length - 1) gap = Math.min(gap, t.x[level[i + 1]] - t.x[id]);
    // zoom in just enough that this node is drawn as a full board
    let s = viewRef.current.s;
    if (Number.isFinite(gap)) s = Math.max(s, (maxBoard / 0.82) / gap);
    animateTo({ s, ox: t.x[id] - w / 2 / s });
  }, [tree, animateTo]);

  // ------------------------------------------------------------ hit testing
  const hitTest = useCallback((sx: number, sy: number): number => {
    const t = tree;
    if (!t) return -1;
    const { h } = sizeRef.current;
    const { top, gap, maxBoard, rowY } = levelGeometry(h);
    const { ox, s } = viewRef.current;
    const d = Math.round((sy - top) / gap);
    if (d < 0 || d > 9) return -1;
    const level = t.levels[d];
    const i = lowerBound(t, level, ox + sx / s);
    let best = -1;
    let bestDist = Infinity;
    for (const j of [i - 1, i]) {
      if (j < 0 || j >= level.length) continue;
      const dist = Math.abs((t.x[level[j]] - ox) * s - sx);
      if (dist < bestDist) { bestDist = dist; best = j; }
    }
    if (best < 0) return -1;
    const size = nodeSize(t, level, best, s, maxBoard);
    const tol = Math.max(size / 2, 6);
    if (bestDist > tol || Math.abs(sy - rowY(d)) > Math.max(size / 2, 8)) return -1;
    return level[best];
  }, [tree]);

  // ------------------------------------------------------- canvas lifecycle
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!tree || !stage || !canvas) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      const r = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: r.width, h: r.height };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      setStageSize({ w: r.width, h: r.height });
      if (first) {
        first = false;
        const s = (r.width - SIDE_MARGIN * 2) / tree.leafCount;
        viewRef.current = { s, ox: -SIDE_MARGIN / s };
      }
      viewRef.current = clampView(viewRef.current);
      draw();
    });
    ro.observe(stage);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { colorsRef.current = null; requestDraw(); };
    mq.addEventListener('change', onScheme);

    // wheel must be non-passive to stop the page from scrolling
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const dx = e.shiftKey ? e.deltaY || e.deltaX : e.deltaX;
        const { ox, s } = viewRef.current;
        setView({ s, ox: ox + dx / s });
      } else {
        const k = e.ctrlKey ? 0.01 : 0.0018;
        zoomAt(Math.exp(-e.deltaY * k), sx);
      }
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      ro.disconnect();
      mq.removeEventListener('change', onScheme);
      canvas.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frameRef.current);
      cancelAnimationFrame(animRef.current);
      frameRef.current = 0;
    };
  }, [tree, draw, requestDraw, clampView, setView, zoomAt]);

  // Dev-only benchmark: renders frames synchronously across the whole zoom range
  // (works even when the tab is hidden and rAF is throttled). Run short ranges,
  // e.g. __treeBench(0, 60): hundreds of back-to-back frames without presenting
  // fill the canvas command buffer and cause one artificial flush spike.
  useEffect(() => {
    if (!import.meta.env.DEV || !tree) return;
    const w = window as unknown as { __treeBench?: (from?: number, to?: number) => object };
    w.__treeBench = (from = 0, to = 300) => {
      // size the canvas from layout directly, in case ResizeObserver has not fired
      const stage = stageRef.current!;
      const canvas = canvasRef.current!;
      const r = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: r.width, h: r.height };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const saved = { ...viewRef.current };
      const { sMin, sMax, w: width } = limits();
      const times: number[] = [];
      for (let k = from; k <= to; k++) {
        const s = Math.exp(Math.log(sMin) + (Math.log(sMax) - Math.log(sMin)) * (k / 300));
        const centre = tree.leafCount * ((k * 7919) % 1000) / 1000; // spread over the tree
        viewRef.current = clampView({ s, ox: centre - width / 2 / s });
        const t0 = performance.now();
        draw();
        times.push(performance.now() - t0);
      }
      viewRef.current = saved;
      draw();
      const sorted = [...times].sort((a, b) => a - b);
      const q = (p: number) => +sorted[Math.floor(p * (sorted.length - 1))].toFixed(2);
      const slowest = times.map((ms, k) => ({ k, ms: +ms.toFixed(1) })).sort((a, b) => b.ms - a.ms).slice(0, 5);
      return { frames: times.length, medianMs: q(0.5), p95Ms: q(0.95), maxMs: q(1), budget120HzMs: 8.33, slowest };
    };
    return () => { delete w.__treeBench; };
  }, [tree, draw, limits, clampView]);

  useEffect(() => {
    selectedRef.current = selected;
    requestDraw();
  }, [selected, requestDraw]);

  // pointer: drag to pan, pinch to zoom, tap/click to select
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, pinchDist: 0 });

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    cancelAnimationFrame(animRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    e.currentTarget.classList.add('dragging');
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      // hover
      const id = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      setHover((h) => (id < 0 ? null : h?.id === id ? h : { id, x: e.clientX - rect.left, y: e.clientY - rect.top }));
      return;
    }
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinchDist > 0) zoomAt(dist / gesture.current.pinchDist, (a.x + b.x) / 2 - rect.left);
      gesture.current.pinchDist = dist;
      gesture.current.moved += 10;
      return;
    }
    const dx = cur.x - prev.x;
    gesture.current.moved += Math.abs(dx) + Math.abs(cur.y - prev.y);
    const { ox, s } = viewRef.current;
    setView({ s, ox: ox - dx / s });
    setHover(null);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasClick = pointers.current.size === 1 && gesture.current.moved < 5;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.pinchDist = 0;
    if (pointers.current.size === 0) e.currentTarget.classList.remove('dragging');
    if (wasClick) {
      const rect = e.currentTarget.getBoundingClientRect();
      const id = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      setSelected(id);
    }
  };

  const randomGame = () => {
    const t = tree!;
    // pick a random finished game (leaf) anywhere in the tree
    let id: number;
    do id = Math.floor(Math.random() * t.size); while (t.result[id] === 0);
    setSelected(id);
    flyTo(id);
  };

  const selectAndFly = useCallback((id: number) => { setSelected(id); flyTo(id); }, [flyTo]);

  // ---------------------------------------------------------------- render
  if (!tree) {
    return (
      <main className="page full">
        <div className="loading" style={{ flex: 1 }}>{t('กำลังสร้าง game tree ทั้งต้น (549,946 node)…', 'Building the full game tree (549,946 nodes)…')}</div>
      </main>
    );
  }

  const { gap, rowY } = levelGeometry(stageSize.h || 600);

  return (
    <main className="page full">
      <div className="tree-page">
        <div className="tree-stage" ref={stageRef}>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => setHover(null)}
            aria-label={t('Game tree ของ Tic-Tac-Toe ทั้งต้น', 'The complete Tic-Tac-Toe game tree')}
          />
          <div className="tree-overlay">
            <button className="btn" onClick={() => zoomAt(2, sizeRef.current.w / 2)} aria-label={t('ซูมเข้า', 'Zoom in')}>＋</button>
            <button className="btn" onClick={() => zoomAt(0.5, sizeRef.current.w / 2)} aria-label={t('ซูมออก', 'Zoom out')}>－</button>
            <button className="btn" onClick={fit}>{t('ดูทั้งต้น', 'Fit')}</button>
            <button className="btn" onClick={() => selected >= 0 && flyTo(selected)} disabled={selected < 0}>{t('ไปที่ node ที่เลือก', 'Go to selection')}</button>
            <button className="btn" onClick={randomGame}>{t('สุ่มเกม', 'Random game')} 🎲</button>
          </div>
          {stageSize.h > 0 && gap > 22 && stageSize.w >= 480 && (
            <div className="depth-labels">
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} style={{ top: rowY(d) }}>
                  {d === 0 ? t('เริ่ม', 'start') : `${t('ตา', 'ply')} ${d} · ${d % 2 ? 'X' : 'O'}`}
                </span>
              ))}
            </div>
          )}
          <div className="legend">
            <span><i style={{ background: 'var(--x)' }} />{t('X ชนะได้', 'X can win')}</span>
            <span><i style={{ background: 'var(--o)' }} />{t('O ชนะได้', 'O can win')}</span>
            <span><i style={{ background: 'var(--draw)' }} />{t('เสมอ', 'Draw')}</span>
            <span className="muted legend-hint">{t('ลากเพื่อเลื่อน · scroll / pinch เพื่อซูม · แตะเพื่อเลือก', 'Drag to pan · scroll / pinch to zoom · tap to select')}</span>
          </div>
          {hover && <Tooltip tree={tree} id={hover.id} x={hover.x} y={hover.y} w={stageSize.w} />}
        </div>
        <SidePanel tree={tree} selected={selected} onSelect={selectAndFly} />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

type Tr = ReturnType<typeof useLang>['t'];

function MiniBoard({ board, last }: { board: Cell[]; last?: number }) {
  return (
    <div className="mini-board">
      {board.map((c, i) => (
        <div key={i} className={`${c === 1 ? 'x' : c === 2 ? 'o' : ''} ${i === last ? 'last' : ''}`}>{symbol(c)}</div>
      ))}
    </div>
  );
}

function valueText(tree: GameTree, id: number, t: Tr) {
  const v = tree.value[id];
  if (v === 0) return tree.result[id] ? t('เสมอแล้ว', 'Drawn') : t('เสมอ (ถ้าเล่นดีที่สุดทั้งคู่)', 'Draw (with perfect play)');
  const who = v > 0 ? 'X' : 'O';
  const plies = 9 - tree.depth[id] - (Math.abs(v) - 10);
  if (plies === 0) return t(`${who} ชนะแล้ว`, `${who} has won`);
  return t(`${who} ชนะได้ใน ${plies} ตา`, `${who} wins in ${plies} ${plies === 1 ? 'ply' : 'plies'}`);
}

function resultText(r: number, t: Tr) {
  return r === RESULT_X ? t('X ชนะ', 'X wins') : r === RESULT_O ? t('O ชนะ', 'O wins') : r === RESULT_DRAW ? t('เสมอ (กระดานเต็ม)', 'Draw (board full)') : '';
}

function stepLabel(tree: GameTree, id: number, t: Tr) {
  const d = tree.depth[id];
  if (d === 0) return t('เริ่มเกม (กระดานว่าง)', 'Start (empty board)');
  const who = d % 2 ? 'X' : 'O';
  return t(`ตา ${d}: ${who} ลงช่อง ${tree.move[id] + 1}`, `Ply ${d}: ${who} plays cell ${tree.move[id] + 1}`);
}

function leafCount(tree: GameTree, id: number) {
  let l = id;
  let r = id;
  while (tree.childCount[l] > 0) l = tree.levels[tree.depth[l] + 1][tree.childStart[l]];
  while (tree.childCount[r] > 0) r = tree.levels[tree.depth[r] + 1][tree.childStart[r] + tree.childCount[r] - 1];
  return tree.x[r] - tree.x[l] + 1;
}

function Tooltip({ tree, id, x, y, w }: { tree: GameTree; id: number; x: number; y: number; w: number }) {
  const { t } = useLang();
  const left = x + 150 > w ? x - 146 : x + 14;
  return (
    <div className="tooltip" style={{ left, top: y + 14 }}>
      <MiniBoard board={boardOf(tree, id)} last={tree.move[id]} />
      <div style={{ marginTop: 6 }}>{stepLabel(tree, id, t)}</div>
      <div className="muted">{tree.result[id] ? resultText(tree.result[id], t) : valueText(tree, id, t)}</div>
    </div>
  );
}

// memo: hovering the canvas re-renders the page; the panel only changes with the selection
const SidePanel = memo(function SidePanel({ tree, selected, onSelect }: { tree: GameTree; selected: number; onSelect: (id: number) => void }) {
  const { t, num } = useLang();
  const path = useMemo(() => (selected >= 0 ? pathTo(tree, selected) : []), [tree, selected]);
  const children = useMemo(() => {
    if (selected < 0 || !tree.childCount[selected]) return [];
    const d = tree.depth[selected];
    const start = tree.childStart[selected];
    return Array.from(tree.levels[d + 1].subarray(start, start + tree.childCount[selected]));
  }, [tree, selected]);

  if (selected < 0) {
    return (
      <aside className="side">
        <h2>{t('Game Tree ทั้งต้น', 'The complete game tree')}</h2>
        <p className="muted">
          {t(
            <>แต่ละแถวคือตาที่เดิน (ตา 1 คือ X, ตา 2 คือ O, …) ทุก node คือกระดานหนึ่งแบบ ตามลำดับการเดินที่ต่างกันทั้งหมด รวม <b>{num(tree.size)}</b> node และ <b>{num(tree.leafCount)}</b> เกมที่จบ</>,
            <>Each row is one ply (ply 1 is X, ply 2 is O, …). Every node is a board reached by a distinct move sequence: <b>{num(tree.size)}</b> nodes and <b>{num(tree.leafCount)}</b> finished games in total.</>,
          )}
        </p>
        <p className="muted">
          {t(
            <>สีของ node คือ <b>ค่า minimax</b> ของกระดานนั้น ซึ่งบอกว่าถ้าเล่นต่อแบบดีที่สุดทั้งสองฝ่าย ใครจะชนะ node ที่ขอบหนาคือเกมที่จบแล้ว (terminal)</>,
            <>A node's colour is the <b>minimax value</b> of its board: who wins if both sides play perfectly from there. Thick-bordered nodes are finished (terminal) games.</>,
          )}
        </p>
        <p className="muted">
          {t(<>ลองแตะ node ไหนก็ได้ หรือกด <b>สุ่มเกม 🎲</b> แล้วเส้นทางจาก root จะถูกไฮไลต์</>, <>Tap any node, or press <b>Random game 🎲</b>, and its path from the root will be highlighted.</>)}
        </p>
        <button className="btn primary" onClick={() => onSelect(0)}>{t('เริ่มที่ root', 'Start at the root')}</button>
      </aside>
    );
  }

  return (
    <aside className="side">
      <h2>{stepLabel(tree, selected, t)}</h2>
      <div className="side-board">
        <MiniBoard board={boardOf(tree, selected)} last={tree.move[selected]} />
      </div>
      <dl className="kv">
        <dt>{t('ความลึก', 'Depth')}</dt><dd>{tree.depth[selected]}</dd>
        {tree.result[selected] ? (
          <><dt>{t('ผลเกม', 'Result')}</dt><dd>{resultText(tree.result[selected], t)}</dd></>
        ) : (
          <><dt>{t('ตาถัดไป', 'To move')}</dt><dd>{tree.depth[selected] % 2 ? 'O' : 'X'}</dd></>
        )}
        <dt>{t('ค่า minimax', 'Minimax value')}</dt><dd>{valueText(tree, selected, t)}</dd>
        {!tree.result[selected] && (
          <>
            <dt>{t('node ลูกหลาน', 'Descendants')}</dt><dd>{num(tree.subtree[selected] - 1)}</dd>
            <dt>{t('เกมที่จบได้', 'Finished games')}</dt><dd>{num(leafCount(tree, selected))}</dd>
          </>
        )}
      </dl>

      {children.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>{t('ตาถัดไปที่เป็นไปได้', 'Possible next moves')}</h3>
          <div className="child-grid">
            {children.map((c) => (
              <button
                key={c}
                onClick={() => onSelect(c)}
                title={`${stepLabel(tree, c, t)} · ${valueText(tree, c, t)}`}
                className="child-btn"
                style={{ borderColor: tree.value[c] > 0 ? 'var(--x)' : tree.value[c] < 0 ? 'var(--o)' : 'var(--draw)' }}
              >
                <MiniBoard board={boardOf(tree, c)} last={tree.move[c]} />
              </button>
            ))}
          </div>
        </>
      )}

      <h3 style={{ marginTop: 20 }}>{t('เส้นทางจาก root', 'Path from the root')}</h3>
      <ol className="path-list">
        {path.map((id) => (
          <li key={id}>
            <button className={id === selected ? 'current' : ''} onClick={() => onSelect(id)}>
              <MiniBoard board={boardOf(tree, id)} last={tree.move[id]} />
              <span>
                {stepLabel(tree, id, t)}
                <br />
                <span className="muted">{valueText(tree, id, t)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
});
