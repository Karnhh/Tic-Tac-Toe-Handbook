// Core Tic-Tac-Toe logic + minimax engine.
// Cells are numbered 0..8 (row-major). 0 = empty, 1 = X, 2 = O.

export type Cell = 0 | 1 | 2;
export type Board = Cell[];
export type Player = 1 | 2;

export const EMPTY: Cell = 0;
export const X: Player = 1;
export const O: Player = 2;

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const symbol = (c: Cell) => (c === 1 ? 'X' : c === 2 ? 'O' : '');
export const other = (p: Player): Player => (p === X ? O : X);

export function emptyBoard(): Board {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

/** Returns the winner (1 or 2) or 0 when nobody has three in a row. */
export function winner(b: ArrayLike<number>): Cell {
  for (const [a, c, d] of LINES) {
    if (b[a] !== 0 && b[a] === b[c] && b[a] === b[d]) return b[a] as Cell;
  }
  return 0;
}

export function winningLine(b: ArrayLike<number>): readonly number[] | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] !== 0 && b[a] === b[c] && b[a] === b[d]) return line;
  }
  return null;
}

export function countMarks(b: ArrayLike<number>) {
  let x = 0;
  let o = 0;
  for (let i = 0; i < 9; i++) {
    if (b[i] === 1) x++;
    else if (b[i] === 2) o++;
  }
  return { x, o, empty: 9 - x - o };
}

export type BoardStatus =
  | { kind: 'invalid'; reason: string }
  | { kind: 'over'; winner: Cell; line: readonly number[] | null }
  | { kind: 'playing'; toMove: Player };

/** Checks whether a board can be reached in a real game, and whose turn it is. */
export function boardStatus(b: Board): BoardStatus {
  const { x, o, empty } = countMarks(b);
  if (x < o) return { kind: 'invalid', reason: 'มี O มากกว่า X ซึ่งเป็นไปไม่ได้ เพราะ X เดินก่อนเสมอ' };
  if (x > o + 1) return { kind: 'invalid', reason: `X มากกว่า O เกิน 1 ตัว (X ${x}, O ${o}) แปลว่ามีฝ่ายเดินซ้อนสองตา` };

  let xLines = 0;
  let oLines = 0;
  for (const [a, c, d] of LINES) {
    if (b[a] !== 0 && b[a] === b[c] && b[a] === b[d]) {
      if (b[a] === 1) xLines++;
      else oLines++;
    }
  }
  if (xLines > 0 && oLines > 0) return { kind: 'invalid', reason: 'ทั้ง X และ O เรียงครบ 3 พร้อมกัน ซึ่งเป็นไปไม่ได้' };
  if (xLines > 0 && x !== o + 1) return { kind: 'invalid', reason: 'X ชนะแล้ว แต่ O ยังได้เดินต่อหลังจากนั้น' };
  if (oLines > 0 && x !== o) return { kind: 'invalid', reason: 'O ชนะแล้ว แต่ X ยังได้เดินต่อหลังจากนั้น' };

  if (xLines > 0) return { kind: 'over', winner: 1, line: winningLine(b) };
  if (oLines > 0) return { kind: 'over', winner: 2, line: winningLine(b) };
  if (empty === 0) return { kind: 'over', winner: 0, line: null };
  return { kind: 'playing', toMove: x === o ? X : O };
}

export function toMove(b: ArrayLike<number>): Player {
  const { x, o } = countMarks(b);
  return x === o ? X : O;
}

/** Base-3 key of a board: unique integer in [0, 3^9). */
export function boardKey(b: ArrayLike<number>): number {
  let k = 0;
  for (let i = 0; i < 9; i++) k = k * 3 + b[i];
  return k;
}

// ---------------------------------------------------------------------------
// Minimax with depth-aware scores, from X's point of view.
//   X wins  -> +(10 + emptyCellsLeft)   (faster win = bigger score)
//   O wins  -> -(10 + emptyCellsLeft)
//   draw    -> 0
// Because the score depends only on the board, it can be memoised by board key.
// ---------------------------------------------------------------------------

const memo = new Map<number, number>();

export function minimaxValue(b: Cell[]): number {
  const key = boardKey(b);
  const hit = memo.get(key);
  if (hit !== undefined) return hit;

  const w = winner(b);
  const { empty } = countMarks(b);
  let v: number;
  if (w === 1) v = 10 + empty;
  else if (w === 2) v = -(10 + empty);
  else if (empty === 0) v = 0;
  else {
    const p = toMove(b);
    v = p === X ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== 0) continue;
      b[i] = p;
      const child = minimaxValue(b);
      b[i] = 0;
      v = p === X ? Math.max(v, child) : Math.min(v, child);
    }
  }
  memo.set(key, v);
  return v;
}

export type Outcome = 'win' | 'draw' | 'lose';

export interface MoveAnalysis {
  cell: number;
  /** Minimax score from the perspective of `me` (positive is good). */
  score: number;
  outcome: Outcome;
  /** Number of plies (moves by either side, counting this one) until the game ends with perfect play. */
  pliesToEnd: number;
  best: boolean;
}

/** Converts an X-perspective score into an outcome for `me`, plus how many plies remain from `empty`. */
export function describeScore(scoreX: number, me: Player, emptyNow: number) {
  const score = me === X ? scoreX : -scoreX;
  const outcome: Outcome = score > 0 ? 'win' : score < 0 ? 'lose' : 'draw';
  const emptyAtEnd = scoreX === 0 ? 0 : Math.abs(scoreX) - 10;
  return { score, outcome, pliesToEnd: emptyNow - emptyAtEnd };
}

/** Evaluates every legal move for the player to move (`me`). */
export function analyzeMoves(board: Board, me: Player): MoveAnalysis[] {
  const b = board.slice() as Cell[];
  const { empty } = countMarks(b);
  const res: MoveAnalysis[] = [];
  for (let i = 0; i < 9; i++) {
    if (b[i] !== 0) continue;
    b[i] = me;
    const v = minimaxValue(b);
    b[i] = 0;
    const d = describeScore(v, me, empty);
    res.push({ cell: i, score: d.score, outcome: d.outcome, pliesToEnd: d.pliesToEnd, best: false });
  }
  const top = Math.max(...res.map((r) => r.score));
  for (const r of res) r.best = r.score === top;
  return res;
}

/** The expected continuation if both sides play perfectly (first best move each turn). */
export function principalVariation(board: Board): { cell: number; player: Player }[] {
  const b = board.slice() as Cell[];
  const line: { cell: number; player: Player }[] = [];
  while (boardStatus(b).kind === 'playing') {
    const p = toMove(b);
    const moves = analyzeMoves(b, p);
    const best = moves.find((m) => m.best)!;
    line.push({ cell: best.cell, player: p });
    b[best.cell] = p;
  }
  return line;
}

// ---------------------------------------------------------------------------
// Node counters (no memo) to compare plain minimax with α–β pruning.
// ---------------------------------------------------------------------------

function terminalScore(b: Cell[], empty: number): number | null {
  const w = winner(b);
  if (w === 1) return 10 + empty;
  if (w === 2) return -(10 + empty);
  if (empty === 0) return 0;
  return null;
}

export function countMinimaxNodes(board: Board): number {
  const b = board.slice() as Cell[];
  let nodes = 0;
  const rec = (empty: number, p: Player): number => {
    nodes++;
    const t = terminalScore(b, empty);
    if (t !== null) return t;
    let v = p === X ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== 0) continue;
      b[i] = p;
      const c = rec(empty - 1, other(p));
      b[i] = 0;
      v = p === X ? Math.max(v, c) : Math.min(v, c);
    }
    return v;
  };
  rec(countMarks(b).empty, toMove(b));
  return nodes;
}

export function countAlphaBetaNodes(board: Board): number {
  const b = board.slice() as Cell[];
  let nodes = 0;
  const rec = (empty: number, p: Player, alpha: number, beta: number): number => {
    nodes++;
    const t = terminalScore(b, empty);
    if (t !== null) return t;
    if (p === X) {
      let v = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] !== 0) continue;
        b[i] = p;
        v = Math.max(v, rec(empty - 1, O, alpha, beta));
        b[i] = 0;
        if (v >= beta) return v;
        alpha = Math.max(alpha, v);
      }
      return v;
    }
    let v = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== 0) continue;
      b[i] = p;
      v = Math.min(v, rec(empty - 1, X, alpha, beta));
      b[i] = 0;
      if (v <= alpha) return v;
      beta = Math.min(beta, v);
    }
    return v;
  };
  rec(countMarks(b).empty, toMove(b), -Infinity, Infinity);
  return nodes;
}
