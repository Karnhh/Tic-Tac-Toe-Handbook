import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeMoves,
  boardStatus,
  countAlphaBetaNodes,
  countMinimaxNodes,
  emptyBoard,
  minimaxValue,
  type Board,
} from './game.ts';
import { buildGameTree, boardOf, pathTo, RESULT_DRAW, RESULT_O, RESULT_X } from './tree.ts';

const parse = (s: string): Board =>
  s.replace(/\s/g, '').split('').map((c) => (c === 'X' ? 1 : c === 'O' ? 2 : 0)) as Board;

test('perfect play from the empty board is a draw', () => {
  assert.equal(minimaxValue(emptyBoard()), 0);
});

test('takes an immediate win', () => {
  // X X .
  // O O .
  // . . .
  const moves = analyzeMoves(parse('XX. OO. ...'), 1);
  const best = moves.filter((m) => m.best).map((m) => m.cell);
  assert.deepEqual(best, [2]);
  assert.equal(moves.find((m) => m.cell === 2)!.pliesToEnd, 1);
});

test('O blocks a threat', () => {
  // X X .
  // . O .
  // . . .
  const moves = analyzeMoves(parse('XX. .O. ...'), 2);
  assert.deepEqual(moves.filter((m) => m.best).map((m) => m.cell), [2]);
});

test('O must answer a corner opening with the center', () => {
  const moves = analyzeMoves(parse('X.. ... ...'), 2);
  assert.deepEqual(moves.filter((m) => m.outcome === 'draw').map((m) => m.cell), [4]);
});

test('board validation', () => {
  assert.equal(boardStatus(parse('OO. ... ...')).kind, 'invalid');
  assert.equal(boardStatus(parse('XXX OO. ...')).kind, 'over');
  assert.equal(boardStatus(parse('XXX OOO ...')).kind, 'invalid');
  const s = boardStatus(parse('X.. ... ...'));
  assert.ok(s.kind === 'playing' && s.toMove === 2);
});

test('alpha-beta visits fewer nodes than minimax', () => {
  const mm = countMinimaxNodes(emptyBoard());
  const ab = countAlphaBetaNodes(emptyBoard());
  assert.equal(mm, 549_946);
  assert.ok(ab < mm / 10, `alpha-beta visited ${ab}`);
});

test('full game tree has the known sizes', () => {
  const t = buildGameTree();
  assert.equal(t.size, 549_946);
  assert.equal(t.leafCount, 255_168);
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < t.size; i++) counts[t.result[i]]++;
  assert.equal(counts[RESULT_X], 131_184);
  assert.equal(counts[RESULT_O], 77_904);
  assert.equal(counts[RESULT_DRAW], 46_080);
  assert.deepEqual(
    t.levels.map((l) => l.length),
    [1, 9, 72, 504, 3024, 15120, 54720, 148176, 200448, 127872],
  );
  // levels must be sorted by x
  for (const l of t.levels) for (let i = 1; i < l.length; i++) assert.ok(t.x[l[i]] > t.x[l[i - 1]]);
  // path + board reconstruction
  const leafId = t.levels[9][0];
  assert.equal(pathTo(t, leafId).length, 10);
  assert.equal(boardOf(t, leafId).filter((c) => c === 0).length, 0);
});
