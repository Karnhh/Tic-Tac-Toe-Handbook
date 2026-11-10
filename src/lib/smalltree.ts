// Small abstract game trees for the theory page: minimax / α–β step traces and
// expectiminimax values.

import type { Msg } from '../i18n.tsx';

export type Kind = 'max' | 'min' | 'chance' | 'leaf';

export interface TNode {
  id: string;
  kind: Kind;
  name: string; // short display name (A, B, … for inner nodes; leaf index for leaves)
  value?: number; // leaves only
  prob?: number; // probability of the edge from a chance parent
  label?: string; // edge label (e.g. A11)
  children?: TNode[];
}

export type NodeStatus = 'idle' | 'active' | 'done' | 'pruned';
export interface NodeView { text?: string; status: NodeStatus; sub?: string }
export type EdgeStatus = 'pruned' | 'best';

export interface Step {
  nodes: Record<string, NodeView>;
  edges: Record<string, EdgeStatus>;
  msg: Msg;
  leavesEvaluated: number;
}

export const edgeKey = (p: string, c: string) => `${p}>${c}`;

export const SLIDE_LEAVES = [3, 12, 8, 2, 4, 6, 14, 5, 2];

/** Uniform tree with alternating MAX / MIN levels (root = MAX). */
export function buildTree(depth: number, branching: number, leaves: number[], withLabels = false): TNode {
  let leafIdx = 0;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let letter = 0;
  // assign inner-node letters in breadth-first order for readable names
  const make = (d: number, label: string): TNode => {
    if (d === depth) {
      const i = leafIdx++;
      return { id: `L${i}`, kind: 'leaf', name: `${i + 1}`, value: leaves[i] ?? 0, label };
    }
    const kids: TNode[] = [];
    for (let k = 0; k < branching; k++) kids.push(make(d + 1, withLabels ? `${label}${k + 1}` : ''));
    return { id: `N${d}-${label || Math.random()}`, kind: d % 2 === 0 ? 'max' : 'min', name: '', label, children: kids };
  };
  const root = make(0, withLabels ? 'A' : '');
  // BFS naming + stable ids
  const queue: TNode[] = [root];
  let n = 0;
  while (queue.length) {
    const node = queue.shift()!;
    if (node.kind !== 'leaf') {
      node.name = letters[letter++ % 26];
      node.id = `N${n++}`;
      queue.push(...node.children!);
    }
  }
  if (withLabels) root.label = '';
  return root;
}

export function leafCount(n: TNode): number {
  return n.children ? n.children.reduce((s, c) => s + leafCount(c), 0) : 1;
}

export function leavesOf(n: TNode): TNode[] {
  return n.children ? n.children.flatMap(leavesOf) : [n];
}

export function allNodes(n: TNode): TNode[] {
  return [n, ...(n.children ?? []).flatMap(allNodes)];
}

/** Returns a copy of the tree with new leaf values (in left-to-right order). */
export function withLeafValues(root: TNode, values: number[]): TNode {
  let i = 0;
  const rec = (n: TNode): TNode =>
    n.children ? { ...n, children: n.children.map(rec) } : { ...n, value: values[i++] ?? n.value };
  return rec(root);
}

export function minimax(n: TNode): number {
  if (n.kind === 'leaf') return n.value!;
  const vals = n.children!.map(minimax);
  if (n.kind === 'max') return Math.max(...vals);
  if (n.kind === 'min') return Math.min(...vals);
  return n.children!.reduce((s, c, i) => s + (c.prob ?? 1 / n.children!.length) * vals[i], 0);
}

/** Expectiminimax with a value transform applied to the leaves. */
export function evaluate(n: TNode, f: (v: number) => number = (v) => v): number {
  if (n.kind === 'leaf') return f(n.value!);
  const vals = n.children!.map((c) => evaluate(c, f));
  if (n.kind === 'max') return Math.max(...vals);
  if (n.kind === 'min') return Math.min(...vals);
  return n.children!.reduce((s, c, i) => s + (c.prob ?? 1 / n.children!.length) * vals[i], 0);
}

/** Reorders children so the best move for the node's player comes first (perfect ordering) or last (worst). */
export function reorder(n: TNode, mode: 'best' | 'worst'): TNode {
  if (!n.children) return n;
  const kids = n.children.map((c) => reorder(c, mode));
  const scored = kids.map((c) => ({ c, v: minimax(c) }));
  const asc = n.kind === 'min';
  scored.sort((a, b) => (asc ? a.v - b.v : b.v - a.v) * (mode === 'best' ? 1 : -1));
  return { ...n, children: scored.map((s) => s.c) };
}

const KIND_TH: Record<Kind, string> = { max: 'MAX', min: 'MIN', chance: 'CHANCE', leaf: 'leaf' };
const fmt = (v: number) => (v === Infinity ? '+∞' : v === -Infinity ? '−∞' : String(Math.round(v * 100) / 100));

// ---------------------------------------------------------------------------
// Step recorder shared by the traces
// ---------------------------------------------------------------------------

function recorder(root: TNode) {
  const nodes: Record<string, NodeView> = {};
  for (const n of allNodes(root)) nodes[n.id] = { status: 'idle' };
  const edges: Record<string, EdgeStatus> = {};
  const steps: Step[] = [];
  let leaves = 0;
  return {
    nodes,
    edges,
    steps,
    countLeaf: () => leaves++,
    snap: (msg: Msg) =>
      steps.push({
        nodes: Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, { ...v }])),
        edges: { ...edges },
        msg,
        leavesEvaluated: leaves,
      }),
  };
}

/** Marks the root edge MAX actually chooses (first child whose exact value equals the root value). */
function markBest(root: TNode, rootValue: number, exact: Map<string, number>, edges: Record<string, EdgeStatus>) {
  const best = root.children!.find((c) => exact.get(c.id) === rootValue);
  if (best) edges[edgeKey(root.id, best.id)] = 'best';
}

const fromTh = (c: TNode) => (c.kind === 'leaf' ? `leaf ตัวที่ ${c.name}` : `ลูก ${c.name}`);
const fromEn = (c: TNode) => (c.kind === 'leaf' ? `leaf #${c.name}` : `child ${c.name}`);

/** Plain minimax, one step per child result. */
export function minimaxTrace(root: TNode): Step[] {
  const r = recorder(root);
  const exact = new Map<string, number>();
  r.snap({
    th: 'เริ่มที่ root ระบบจะค้นแบบ depth-first แล้วส่งค่าจาก leaf ขึ้นไปทีละชั้น',
    en: 'Start at the root. The search goes depth-first and backs values up from the leaves, one level at a time.',
  });

  const rec = (n: TNode): number => {
    if (n.kind === 'leaf') {
      r.countLeaf();
      r.nodes[n.id] = { status: 'done', text: fmt(n.value!) };
      exact.set(n.id, n.value!);
      return n.value!;
    }
    r.nodes[n.id].status = 'active';
    const isMax = n.kind === 'max';
    let v = isMax ? -Infinity : Infinity;
    const seen: number[] = [];
    for (const c of n.children!) {
      const cv = rec(c);
      r.nodes[n.id].status = 'active';
      seen.push(cv);
      v = isMax ? Math.max(v, cv) : Math.min(v, cv);
      r.nodes[n.id].text = fmt(v);
      const calc = `${isMax ? 'max' : 'min'}(${seen.map(fmt).join(', ')}) = ${fmt(v)}`;
      r.snap({
        th: `${KIND_TH[n.kind]} node ${n.name} ได้ค่า ${fmt(cv)} จาก${fromTh(c)} → ${calc}`,
        en: `${KIND_TH[n.kind]} node ${n.name} receives ${fmt(cv)} from ${fromEn(c)} → ${calc}`,
      });
    }
    r.nodes[n.id] = { status: 'done', text: fmt(v) };
    exact.set(n.id, v);
    return v;
  };

  const v = rec(root);
  markBest(root, v, exact, r.edges);
  r.snap({
    th: `เสร็จ: ค่า minimax ของ root = ${fmt(v)} MAX เลือกกิ่งที่ให้ค่านี้ (เส้นสีม่วง)`,
    en: `Done: the minimax value of the root is ${fmt(v)}. MAX picks the branch that achieves it (purple edge).`,
  });
  return r.steps;
}

function prune(n: TNode, parent: TNode, r: ReturnType<typeof recorder>) {
  r.edges[edgeKey(parent.id, n.id)] = 'pruned';
  r.nodes[n.id].status = 'pruned';
  if (n.kind === 'leaf') r.nodes[n.id].text = fmt(n.value!);
  for (const c of n.children ?? []) prune(c, n, r);
}

/** α–β pruning trace. Partial values are shown as bounds (≥ v / ≤ v) like the slides. */
export function alphaBetaTrace(root: TNode): Step[] {
  const r = recorder(root);
  const exact = new Map<string, number>();
  r.snap({ th: 'เริ่มที่ root ด้วย α = −∞, β = +∞', en: 'Start at the root with α = −∞, β = +∞.' });

  const rec = (n: TNode, alpha: number, beta: number): number => {
    if (n.kind === 'leaf') {
      r.countLeaf();
      r.nodes[n.id] = { status: 'done', text: fmt(n.value!) };
      exact.set(n.id, n.value!);
      return n.value!;
    }
    const isMax = n.kind === 'max';
    r.nodes[n.id] = { status: 'active', sub: `α=${fmt(alpha)} β=${fmt(beta)}` };
    if (n !== root) {
      r.snap({
        th: `ลงไปที่ ${KIND_TH[n.kind]} node ${n.name} พร้อม α = ${fmt(alpha)}, β = ${fmt(beta)} ที่สืบทอดมาจากเส้นทางด้านบน`,
        en: `Descend to ${KIND_TH[n.kind]} node ${n.name}, inheriting α = ${fmt(alpha)}, β = ${fmt(beta)} from the path above.`,
      });
    }
    let v = isMax ? -Infinity : Infinity;
    const kids = n.children!;
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i];
      const cv = rec(c, alpha, beta);
      r.nodes[n.id].status = 'active';
      v = isMax ? Math.max(v, cv) : Math.min(v, cv);
      const last = i === kids.length - 1;
      const cut = isMax ? v >= beta : v <= alpha;
      r.nodes[n.id].text = last && !cut ? fmt(v) : `${isMax ? '≥' : '≤'} ${fmt(v)}`;

      if (cut && !last) {
        for (const rest of kids.slice(i + 1)) prune(rest, n, r);
        r.nodes[n.id].status = 'done';
        r.snap(
          isMax
            ? {
                th: `MAX node ${n.name} ได้ ${fmt(cv)} จาก${fromTh(c)} → v = ${fmt(v)} ≥ β = ${fmt(beta)} ` +
                  `MIN ด้านบนมีทางเลือกที่ดีกว่า (≤ ${fmt(beta)}) อยู่แล้ว จึงไม่มีวันปล่อยให้มาถึงตรงนี้ ✂ ตัดลูกที่เหลือทิ้ง`,
                en: `MAX node ${n.name} receives ${fmt(cv)} from ${fromEn(c)} → v = ${fmt(v)} ≥ β = ${fmt(beta)}. ` +
                  `MIN above already has a better option (≤ ${fmt(beta)}), so it will never let play reach here ✂ prune the remaining children.`,
              }
            : {
                th: `MIN node ${n.name} ได้ ${fmt(cv)} จาก${fromTh(c)} → v = ${fmt(v)} ≤ α = ${fmt(alpha)} ` +
                  `MAX ด้านบนมีทางเลือกที่ได้ ≥ ${fmt(alpha)} อยู่แล้ว จะไม่เลือกทางนี้แน่ ✂ ตัดลูกที่เหลือทิ้ง`,
                en: `MIN node ${n.name} receives ${fmt(cv)} from ${fromEn(c)} → v = ${fmt(v)} ≤ α = ${fmt(alpha)}. ` +
                  `MAX above can already get ≥ ${fmt(alpha)}, so it will never choose this branch ✂ prune the remaining children.`,
              },
        );
        return v;
      }
      const before = isMax ? alpha : beta;
      if (isMax) alpha = Math.max(alpha, v);
      else beta = Math.min(beta, v);
      r.nodes[n.id].sub = `α=${fmt(alpha)} β=${fmt(beta)}`;
      const changed = (isMax ? alpha : beta) !== before;
      const sym = isMax ? 'α' : 'β';
      const nv = fmt(isMax ? alpha : beta);
      r.snap({
        th: `${KIND_TH[n.kind]} node ${n.name} ได้ ${fmt(cv)} จาก${fromTh(c)} → v = ${fmt(v)}` +
          (changed ? ` อัปเดต ${sym} = ${nv}` : ` (${sym} ไม่เปลี่ยน)`),
        en: `${KIND_TH[n.kind]} node ${n.name} receives ${fmt(cv)} from ${fromEn(c)} → v = ${fmt(v)}` +
          (changed ? `, update ${sym} = ${nv}` : ` (${sym} unchanged)`),
      });
    }
    r.nodes[n.id] = { ...r.nodes[n.id], status: 'done', text: fmt(v) };
    exact.set(n.id, v);
    return v;
  };

  const v = rec(root, -Infinity, Infinity);
  markBest(root, v, exact, r.edges);
  const total = leavesOf(root).length;
  const done = r.steps[r.steps.length - 1].leavesEvaluated;
  r.snap({
    th: `เสร็จ: ค่าที่ root = ${fmt(v)} เท่ากับ minimax ทุกประการ แต่ประเมิน leaf ไปแค่ ${done} จาก ${total} ตัว`,
    en: `Done: the root value is ${fmt(v)}, exactly the same as minimax, but only ${done} of ${total} leaves were evaluated.`,
  });
  return r.steps;
}

// ---------------------------------------------------------------------------
// Preset trees used by the expectiminimax / value-transform demos
// ---------------------------------------------------------------------------

const leaf = (id: string, value: number, prob?: number): TNode => ({ id, kind: 'leaf', name: id, value, prob });

/** Coin-flip example: MAX → 2 chance nodes → 2 MIN nodes each → 2 leaves each. */
export function chanceTree(values: number[], pLeft: [number, number]): TNode {
  const mins = (k: number, p: number): TNode[] => [
    { id: `m${k}a`, kind: 'min', name: '', prob: p, children: [leaf(`l${k}0`, values[k * 4]), leaf(`l${k}1`, values[k * 4 + 1])] },
    { id: `m${k}b`, kind: 'min', name: '', prob: 1 - p, children: [leaf(`l${k}2`, values[k * 4 + 2]), leaf(`l${k}3`, values[k * 4 + 3])] },
  ];
  return {
    id: 'root', kind: 'max', name: 'A',
    children: [
      { id: 'c0', kind: 'chance', name: 'B', children: mins(0, pLeft[0]) },
      { id: 'c1', kind: 'chance', name: 'C', children: mins(1, pLeft[1]) },
    ],
  };
}

/** MAX → 2 MIN → 2 leaves each (slide "exact values don't matter"). */
export function tinyMinimaxTree(values: [number, number, number, number]): TNode {
  return {
    id: 'root', kind: 'max', name: 'A',
    children: [
      { id: 'b', kind: 'min', name: 'B', children: [leaf('t0', values[0]), leaf('t1', values[1])] },
      { id: 'c', kind: 'min', name: 'C', children: [leaf('t2', values[2]), leaf('t3', values[3])] },
    ],
  };
}

/** Index of the root child chosen by MAX (first best). */
export function bestChild(root: TNode, f?: (v: number) => number): number {
  const vals = root.children!.map((c) => evaluate(c, f));
  return vals.indexOf(Math.max(...vals));
}
