import { useMemo, useState } from 'react';
import TreeDiagram from '../TreeDiagram.tsx';
import { useLang } from '../../i18n.tsx';
import {
  bestChild,
  chanceTree,
  edgeKey,
  evaluate,
  tinyMinimaxTree,
  type EdgeStatus,
  type TNode,
} from '../../lib/smalltree.ts';

const r2 = (v: number) => Math.round(v * 100) / 100;

function bestEdges(root: TNode, f?: (v: number) => number): Record<string, EdgeStatus> {
  const i = bestChild(root, f);
  return { [edgeKey(root.id, root.children![i].id)]: 'best' };
}

// ---------------------------------------------------------------------------
// Expectiminimax: coin-flip tree with adjustable probabilities and leaves
// ---------------------------------------------------------------------------

const COIN_LEAVES = [2, 4, 7, 4, 6, 0, 5, -2];

export function ExpectiminimaxDemo() {
  const { t } = useLang();
  const [values, setValues] = useState(COIN_LEAVES);
  const [p, setP] = useState<[number, number]>([0.5, 0.5]);
  const [editing, setEditing] = useState<number | null>(null);

  const tree = useMemo(() => chanceTree(values, p), [values, p]);
  const leafIds = useMemo(() => tree.children!.flatMap((x) => x.children!.flatMap((y) => y.children!.map((z) => z.id))), [tree]);
  const [b, c] = tree.children!;
  const vb = evaluate(b);
  const vc = evaluate(c);

  const explain = (n: TNode) => {
    const [l, r] = n.children!;
    return `${r2(l.prob!)} × ${evaluate(l)} + ${r2(r.prob!)} × ${evaluate(r)} = ${r2(evaluate(n))}`;
  };

  return (
    <div className="widget">
      <div className="diagram-wrap">
        <TreeDiagram
          root={tree}
          valueText={(n) => (n.kind === 'leaf' ? undefined : String(r2(evaluate(n))))}
          edges={bestEdges(tree)}
          onLeafClick={(_, i) => setEditing(i)}
          selectedLeaf={editing !== null ? leafIds[editing] : undefined}
          ariaLabel={t('แผนภาพ expectiminimax', 'Expectiminimax diagram')}
        />
      </div>
      {editing !== null && (
        <div className="leaf-editor">
          <span>{t('แก้ค่า leaf', 'Edit leaf')} {editing + 1}</span>
          <input
            type="number"
            value={values[editing]}
            onChange={(e) => { const v = values.slice(); v[editing] = Number(e.target.value) || 0; setValues(v); }}
            aria-label={t(`ค่า leaf ${editing + 1}`, `Leaf ${editing + 1} value`)}
          />
          <button className="btn" onClick={() => setEditing(null)}>{t('เสร็จ', 'Done')}</button>
        </div>
      )}
      <div className="slider-grid">
        {(['B', 'C'] as const).map((name, k) => (
          <label key={name} className="slider">
            <span>
              {t(`โอกาสออกหัวที่ chance node ${name}:`, `Chance node ${name}: P(heads) =`)} <b className="mono">{r2(p[k])}</b>
              {' / '}{t('ก้อย', 'tails')} <b className="mono">{r2(1 - p[k])}</b>
            </span>
            <input
              type="range" min={0} max={1} step={0.05} value={p[k]}
              onChange={(e) => { const n: [number, number] = [...p]; n[k] = Number(e.target.value); setP(n); }}
            />
          </label>
        ))}
      </div>
      <div className="calc">
        <div><b>B</b> = {explain(b)}</div>
        <div><b>C</b> = {explain(c)}</div>
        <div>
          <b>A</b> (MAX) = max({r2(vb)}, {r2(vc)}) = {r2(Math.max(vb, vc))} → {t('MAX เลือก', 'MAX chooses')} <b>{vb >= vc ? 'B' : 'C'}</b>
        </div>
      </div>
      <p className="widget-hint">
        {t('ลองเลื่อนความน่าจะเป็น หรือคลิก leaf เพื่อแก้ค่า แล้วดูว่า MAX เปลี่ยนใจตอนไหน', 'Move the probability sliders or click a leaf to edit it, and watch when MAX changes its mind.')}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Value transforms: ordinal (deterministic) vs cardinal (chance) utilities
// ---------------------------------------------------------------------------

type TransformKey = 'id' | 'slide' | 'square' | 'linear';
const SLIDE_MAP: Record<number, number> = { 1: 1, 2: 20, 3: 30, 4: 400 };
const TRANSFORMS: Record<TransformKey, { th: string; en: string; f: (v: number) => number; kind: 'none' | 'monotonic' | 'linear' }> = {
  id: { th: 'ค่าเดิม f(x) = x', en: 'Original f(x) = x', f: (v) => v, kind: 'none' },
  slide: { th: 'ตามสไลด์: 1→1, 2→20, 3→30, 4→400', en: 'From the slides: 1→1, 2→20, 3→30, 4→400', f: (v) => SLIDE_MAP[v] ?? v, kind: 'monotonic' },
  square: { th: 'f(x) = x²', en: 'f(x) = x²', f: (v) => v * v, kind: 'monotonic' },
  linear: { th: 'f(x) = 10x + 5', en: 'f(x) = 10x + 5', f: (v) => 10 * v + 5, kind: 'linear' },
};

export function ValueTransformDemo() {
  const { t, lang } = useLang();
  const [key, setKey] = useState<TransformKey>('id');
  const { f, kind } = TRANSFORMS[key];
  const det = useMemo(() => tinyMinimaxTree([1, 2, 2, 4]), []);
  const chance = useMemo(() => chanceTree([2, 2, 3, 3, 1, 1, 4, 4], [0.9, 0.9]), []);
  const detOrig = bestChild(det);
  const chOrig = bestChild(chance);
  const detNow = bestChild(det, f);
  const chNow = bestChild(chance, f);
  const text = (n: TNode) => String(r2(evaluate(n, f)));
  const verdict = (now: number, orig: number, name: string) =>
    `${t('MAX เลือก', 'MAX chooses')} ${name} ${now === orig ? t('· เหมือนเดิม ✓', '· unchanged ✓') : t('· เปลี่ยนไป!', '· changed!')}`;

  return (
    <div className="widget">
      <div className="seg wrap" role="tablist">
        {(Object.keys(TRANSFORMS) as TransformKey[]).map((k) => (
          <button key={k} className={`text ${key === k ? 'on' : ''}`} onClick={() => setKey(k)}>{TRANSFORMS[k][lang]}</button>
        ))}
      </div>
      <div className="two-col" style={{ marginTop: 12 }}>
        <div>
          <h4>{t('เกม deterministic (minimax)', 'Deterministic game (minimax)')}</h4>
          <div className="diagram-wrap">
            <TreeDiagram root={det} valueText={text} edges={bestEdges(det, f)} leafGap={56} levelGap={84} ariaLabel={t('minimax หลังแปลงค่า', 'Minimax after the transform')} />
          </div>
          <p className={`verdict ${detNow === detOrig ? 'same' : 'diff'}`}>{verdict(detNow, detOrig, det.children![detNow].name)}</p>
        </div>
        <div>
          <h4>{t('เกมที่มีโอกาส (expectiminimax)', 'Game of chance (expectiminimax)')}</h4>
          <div className="diagram-wrap">
            <TreeDiagram root={chance} valueText={text} edges={bestEdges(chance, f)} leafGap={50} levelGap={84} ariaLabel={t('expectiminimax หลังแปลงค่า', 'Expectiminimax after the transform')} />
          </div>
          <p className={`verdict ${chNow === chOrig ? 'same' : 'diff'}`}>{verdict(chNow, chOrig, chance.children![chNow].name)}</p>
        </div>
      </div>
      <p className="widget-hint">
        {kind === 'none' && t(
          'เลือกฟังก์ชันแปลงค่าด้านบน แล้วสังเกตว่าการตัดสินใจของ MAX ในแต่ละแบบเปลี่ยนหรือไม่',
          'Pick a transform above and see whether MAX changes its decision in each kind of game.',
        )}
        {kind === 'linear' && t(
          'การแปลงแบบ positive linear (ax + b, a > 0) รักษาทั้งลำดับและสัดส่วนของค่า จึงไม่เปลี่ยนการตัดสินใจทั้งสองแบบ',
          'A positive linear transform (ax + b, a > 0) preserves both the order and the proportions of values, so neither decision changes.',
        )}
        {kind === 'monotonic' && t(
          'การแปลงแบบ monotonic รักษาลำดับของค่าไว้ minimax ซึ่งดูแค่ลำดับจึงตัดสินใจเหมือนเดิมเสมอ ส่วน expectiminimax ใช้ค่าเฉลี่ย พอสัดส่วนของค่าเปลี่ยน ผลจึงอาจพลิกได้ (แบบในสไลด์พลิก แต่ x² ในตัวอย่างนี้ยังไม่พลิก)',
          'A monotonic transform preserves the order of values, so minimax, which only compares order, always decides the same way. Expectiminimax takes averages, so once the proportions change its decision can flip (the slide mapping flips it; x² happens not to in this example).',
        )}
      </p>
    </div>
  );
}
