// Builds the complete Tic-Tac-Toe game tree (every possible move sequence)
// into flat typed arrays, plus a horizontal "leaf-order" layout.
//
//   - Every leaf (finished game) gets the next integer x position.
//   - Every internal node sits in the middle of its first and last child.
//   - Nodes are stored per depth level in left-to-right order, so a level can
//     be binary-searched by x when drawing or hit-testing.

import { minimaxValue, winner, type Cell } from './game.ts';

export const RESULT_NONE = 0;
export const RESULT_X = 1;
export const RESULT_O = 2;
export const RESULT_DRAW = 3;

export interface GameTree {
  size: number;
  leafCount: number;
  parent: Int32Array; // -1 for root
  move: Int8Array; // cell index played to reach this node (-1 for root)
  depth: Uint8Array;
  result: Uint8Array; // RESULT_* for terminal nodes, RESULT_NONE otherwise
  value: Int8Array; // minimax score from X's view (depth-aware, see game.ts)
  subtree: Int32Array; // number of nodes in subtree, including itself
  x: Float64Array; // layout position in "leaf units"
  levels: Int32Array[]; // node ids per depth, sorted by x
  levelIndex: Int32Array; // position of each node inside its level array
  childStart: Int32Array; // index into levels[depth+1] of first child
  childCount: Uint8Array;
}

const MAX_NODES = 549_946; // known size of the full game tree

export function buildGameTree(): GameTree {
  const parent = new Int32Array(MAX_NODES);
  const move = new Int8Array(MAX_NODES);
  const depth = new Uint8Array(MAX_NODES);
  const result = new Uint8Array(MAX_NODES);
  const value = new Int8Array(MAX_NODES);
  const subtree = new Int32Array(MAX_NODES);
  const x = new Float64Array(MAX_NODES);
  const levelIndex = new Int32Array(MAX_NODES);
  const childStart = new Int32Array(MAX_NODES);
  const childCount = new Uint8Array(MAX_NODES);
  const levelLists: number[][] = Array.from({ length: 10 }, () => []);

  const board: Cell[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let next = 0;
  let leaf = 0;

  const visit = (par: number, mv: number, d: number): number => {
    const id = next++;
    parent[id] = par;
    move[id] = mv;
    depth[id] = d;
    levelIndex[id] = levelLists[d].length;
    levelLists[d].push(id);
    value[id] = minimaxValue(board);

    const w = winner(board);
    if (w !== 0 || d === 9) {
      result[id] = w === 1 ? RESULT_X : w === 2 ? RESULT_O : RESULT_DRAW;
      x[id] = leaf++;
      subtree[id] = 1;
      return id;
    }

    const player: Cell = d % 2 === 0 ? 1 : 2;
    childStart[id] = levelLists[d + 1].length;
    let first = -1;
    let last = -1;
    let count = 0;
    let size = 1;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== 0) continue;
      board[i] = player;
      const c = visit(id, i, d + 1);
      board[i] = 0;
      if (first < 0) first = c;
      last = c;
      count++;
      size += subtree[c];
    }
    childCount[id] = count;
    subtree[id] = size;
    x[id] = (x[first] + x[last]) / 2;
    return id;
  };

  visit(-1, -1, 0);

  return {
    size: next,
    leafCount: leaf,
    parent,
    move,
    depth,
    result,
    value,
    subtree,
    x,
    levels: levelLists.map((l) => Int32Array.from(l)),
    levelIndex,
    childStart,
    childCount,
  };
}

/** Reconstructs the board of a node by walking up to the root. */
export function boardOf(t: GameTree, id: number): Cell[] {
  const b: Cell[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let n = id; n > 0; n = t.parent[n]) {
    b[t.move[n]] = t.depth[n] % 2 === 1 ? 1 : 2;
  }
  return b;
}

/** Root-to-node list of ids. */
export function pathTo(t: GameTree, id: number): number[] {
  const p: number[] = [];
  for (let n = id; n >= 0; n = t.parent[n]) p.push(n);
  return p.reverse();
}

/** First index in `level` whose x is >= wx. */
export function lowerBound(t: GameTree, level: Int32Array, wx: number): number {
  let lo = 0;
  let hi = level.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t.x[level[mid]] < wx) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
