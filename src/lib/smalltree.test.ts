import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alphaBetaTrace,
  bestChild,
  buildTree,
  chanceTree,
  evaluate,
  minimax,
  minimaxTrace,
  reorder,
  SLIDE_LEAVES,
  tinyMinimaxTree,
} from './smalltree.ts';

const slide = () => buildTree(2, 3, SLIDE_LEAVES, true);

test('slide minimax example: root = 3, MIN nodes = 3, 2, 2', () => {
  const t = slide();
  assert.equal(minimax(t), 3);
  assert.deepEqual(t.children!.map(minimax), [3, 2, 2]);
  const steps = minimaxTrace(t);
  const last = steps[steps.length - 1];
  assert.equal(last.leavesEvaluated, 9);
  assert.equal(last.nodes[t.id].text, '3');
});

test('slide alpha-beta example prunes two leaves under C', () => {
  const t = slide();
  const steps = alphaBetaTrace(t);
  const last = steps[steps.length - 1];
  assert.equal(last.leavesEvaluated, 7);
  assert.equal(last.nodes[t.id].text, '3');
  const [b, c, d] = t.children!;
  assert.equal(last.nodes[b.id].text, '3');
  assert.equal(last.nodes[c.id].text, '≤ 2');
  assert.equal(last.nodes[d.id].text, '2');
  assert.equal(last.nodes[c.children![1].id].status, 'pruned');
  assert.equal(last.nodes[c.children![2].id].status, 'pruned');
});

test('perfect ordering prunes at least as much as worst ordering', () => {
  const t = buildTree(3, 3, Array.from({ length: 27 }, (_, i) => (i * 7) % 19));
  const leaves = (x: typeof t) => alphaBetaTrace(x).at(-1)!.leavesEvaluated;
  assert.ok(leaves(reorder(t, 'best')) <= leaves(reorder(t, 'worst')));
  assert.equal(minimax(reorder(t, 'best')), minimax(t));
});

test('coin-flip chance example from the slides', () => {
  const t = chanceTree([2, 4, 7, 4, 6, 0, 5, -2], [0.5, 0.5]);
  assert.deepEqual(t.children!.map((c) => evaluate(c)), [3, -1]);
  assert.equal(bestChild(t), 0);
});

test('monotonic transform keeps minimax choice but can flip expectiminimax', () => {
  const map: Record<number, number> = { 1: 1, 2: 20, 3: 30, 4: 400 };
  const f = (v: number) => map[v] ?? v;
  const det = tinyMinimaxTree([1, 2, 2, 4]);
  assert.equal(bestChild(det), bestChild(det, f));
  const ch = chanceTree([2, 2, 3, 3, 1, 1, 4, 4], [0.9, 0.9]);
  assert.equal(bestChild(ch), 0);
  assert.equal(bestChild(ch, f), 1);
  assert.equal(Math.round(evaluate(ch.children![0]) * 10) / 10, 2.1);
  assert.equal(Math.round(evaluate(ch.children![1], f) * 10) / 10, 40.9);
});
