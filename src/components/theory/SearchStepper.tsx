import { useEffect, useMemo, useRef, useState } from 'react';
import TreeDiagram from '../TreeDiagram.tsx';
import { useLang } from '../../i18n.tsx';
import {
  alphaBetaTrace,
  buildTree,
  leavesOf,
  minimaxTrace,
  reorder,
  SLIDE_LEAVES,
  type TNode,
} from '../../lib/smalltree.ts';

type Shape = 'slide' | 'd3b2' | 'd3b3';
const SHAPES: Record<Shape, { th: string; en: string; depth: number; b: number }> = {
  slide: { th: 'ตัวอย่างในสไลด์ (2 ชั้น, b = 3)', en: 'Slide example (2 ply, b = 3)', depth: 2, b: 3 },
  d3b2: { th: '3 ชั้น, b = 2', en: '3 ply, b = 2', depth: 3, b: 2 },
  d3b3: { th: '3 ชั้น, b = 3', en: '3 ply, b = 3', depth: 3, b: 3 },
};

const randomLeaves = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 20) + 1);

export default function SearchStepper({ mode }: { mode: 'minimax' | 'alphabeta' }) {
  const { t, m, lang } = useLang();
  const [shape, setShape] = useState<Shape>('slide');
  const [values, setValues] = useState<number[]>(SLIDE_LEAVES);
  const [ordering, setOrdering] = useState<'asis' | 'best' | 'worst'>('asis');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const cfg = SHAPES[shape];
  const base = useMemo(() => buildTree(cfg.depth, cfg.b, values, shape === 'slide'), [cfg, values, shape]);
  const tree: TNode = useMemo(() => (ordering === 'asis' ? base : reorder(base, ordering)), [base, ordering]);
  const steps = useMemo(() => (mode === 'minimax' ? minimaxTrace(tree) : alphaBetaTrace(tree)), [tree, mode]);
  const total = leavesOf(tree).length;

  // after editing a leaf, jump straight to the final answer; otherwise restart
  const jumpToEnd = useRef(false);
  useEffect(() => {
    setStep(jumpToEnd.current ? steps.length - 1 : 0);
    jumpToEnd.current = false;
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) { setPlaying(false); return; }
    const id = setTimeout(() => setStep((s) => s + 1), 1100);
    return () => clearTimeout(id);
  }, [playing, step, steps.length]);

  const cur = steps[Math.min(step, steps.length - 1)];

  const changeShape = (s: Shape) => {
    const c = SHAPES[s];
    setShape(s);
    setEditing(null);
    setValues(s === 'slide' ? SLIDE_LEAVES : randomLeaves(c.b ** c.depth));
  };

  const setLeaf = (i: number, v: number) => {
    const next = values.slice();
    next[i] = v;
    jumpToEnd.current = true;
    setValues(next);
  };

  return (
    <div className="widget">
      <div className="widget-controls">
        <label className="field">
          <span>{t('รูปต้นไม้', 'Tree')}</span>
          <select value={shape} onChange={(e) => changeShape(e.target.value as Shape)}>
            {Object.entries(SHAPES).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
          </select>
        </label>
        {mode === 'alphabeta' && (
          <label className="field">
            <span>{t('ลำดับลูก', 'Move order')}</span>
            <select value={ordering} onChange={(e) => setOrdering(e.target.value as typeof ordering)}>
              <option value="asis">{t('ตามที่ใส่', 'As entered')}</option>
              <option value="best">{t('ดีที่สุดก่อน (perfect ordering)', 'Best first (perfect ordering)')}</option>
              <option value="worst">{t('แย่ที่สุดก่อน', 'Worst first')}</option>
            </select>
          </label>
        )}
        <button className="btn" onClick={() => { setValues(randomLeaves(cfg.b ** cfg.depth)); setEditing(null); }}>{t('สุ่มค่า leaf', 'Random leaves')} 🎲</button>
        {shape === 'slide' && values.join() !== SLIDE_LEAVES.join() && (
          <button className="btn" onClick={() => setValues(SLIDE_LEAVES)}>{t('ค่าเดิมในสไลด์', 'Slide values')}</button>
        )}
      </div>

      <div className="diagram-wrap">
        <TreeDiagram
          root={tree}
          nodes={cur.nodes}
          edges={cur.edges}
          onLeafClick={(n) => setEditing(Number(n.id.slice(1)))}
          selectedLeaf={editing !== null ? `L${editing}` : undefined}
          leafGap={shape === 'd3b3' ? 46 : 58}
          ariaLabel={mode === 'minimax' ? t('แผนภาพ minimax', 'Minimax diagram') : t('แผนภาพ α–β pruning', 'α–β pruning diagram')}
        />
      </div>

      {editing !== null && (
        <div className="leaf-editor">
          <span>{t('แก้ค่า leaf', 'Edit leaf')} {editing + 1}</span>
          <button className="btn" onClick={() => setLeaf(editing, values[editing] - 1)}>−</button>
          <input
            type="number"
            value={values[editing]}
            onChange={(e) => setLeaf(editing, Number(e.target.value) || 0)}
            aria-label={t(`ค่า leaf ${editing + 1}`, `Leaf ${editing + 1} value`)}
          />
          <button className="btn" onClick={() => setLeaf(editing, values[editing] + 1)}>＋</button>
          <button className="btn" onClick={() => setEditing(null)}>{t('เสร็จ', 'Done')}</button>
        </div>
      )}

      <div className="step-msg" aria-live="polite">
        <span className="step-count">{t('ขั้นที่', 'Step')} {step + 1}/{steps.length}</span>
        {m(cur.msg)}
      </div>

      <div className="widget-controls">
        <button className="btn" onClick={() => setStep(0)} disabled={step === 0}>⏮</button>
        <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>◀ {t('ย้อน', 'Back')}</button>
        <button className="btn primary" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={step >= steps.length - 1}>{t('ถัดไป', 'Next')} ▶</button>
        <button className="btn" onClick={() => { if (step >= steps.length - 1) setStep(0); setPlaying((p) => !p); }}>
          {playing ? `⏸ ${t('หยุด', 'Pause')}` : `▶ ${t('เล่นอัตโนมัติ', 'Auto-play')}`}
        </button>
        <button className="btn" onClick={() => setStep(steps.length - 1)} disabled={step >= steps.length - 1}>⏭</button>
        <span className="muted leaf-count">
          {t('ประเมิน leaf แล้ว', 'Leaves evaluated')} <b className="mono">{cur.leavesEvaluated}</b> / {total}
        </span>
      </div>
      <p className="widget-hint">{t('คลิกที่ leaf (สี่เหลี่ยมด้านล่าง) เพื่อแก้ค่า แล้วดูว่าคำตอบเปลี่ยนไปอย่างไร', 'Click a leaf (the squares at the bottom) to edit its value and see how the answer changes.')}</p>
    </div>
  );
}
