import { useMemo, useState, type ReactNode } from 'react';
import {
  analyzeMoves,
  boardKey,
  boardStatus,
  countMarks,
  LINES,
  other,
  symbol,
  winner,
  type Board,
  type Cell,
  type Player,
} from '../../lib/game.ts';
import { useLang } from '../../i18n.tsx';

type T = { th: string; en: string };

// ---------------------------------------------------------------------------
// 1. Types of games (2×2 matrix)
// ---------------------------------------------------------------------------

const TYPES: { key: string; row: 'perfect' | 'imperfect'; col: 'det' | 'chance'; examples: T; detail: T; algo: T }[] = [
  {
    key: 'det-perfect', row: 'perfect', col: 'det',
    examples: { th: 'หมากรุก, หมากฮอส, โกะ, โอเทลโล, Tic-Tac-Toe', en: 'Chess, checkers, Go, Othello, Tic-Tac-Toe' },
    detail: {
      th: 'ทุกอย่างอยู่บนกระดานและไม่มีโชค ผลของแต่ละตาจึงรู้แน่นอน ใช้ minimax / α–β ได้ตรง ๆ (ถ้าต้นไม้ใหญ่เกินไปก็ตัดความลึกแล้วใช้ evaluation function)',
      en: 'Everything is on the board and there is no luck, so the result of every move is known. Minimax / α–β apply directly (cut off the depth and use an evaluation function when the tree is too big).',
    },
    algo: { th: 'Minimax, α–β pruning', en: 'Minimax, α–β pruning' },
  },
  {
    key: 'chance-perfect', row: 'perfect', col: 'chance',
    examples: { th: 'แบ็กแกมมอน, โมโนโพลี', en: 'Backgammon, Monopoly' },
    detail: {
      th: 'เห็นกระดานครบ แต่มีลูกเต๋าหรือการสุ่มเข้ามา ต้องเพิ่ม chance node ใน game tree แล้วคิดค่าคาดหวัง (expected value) ที่ node นั้น',
      en: 'The board is fully visible but dice or other randomness are involved. Chance nodes are added to the game tree and take the expected value of their children.',
    },
    algo: { th: 'Expectiminimax', en: 'Expectiminimax' },
  },
  {
    key: 'det-imperfect', row: 'imperfect', col: 'det',
    examples: { th: 'Battleship (เรือรบ), Tic-Tac-Toe แบบปิดตา', en: 'Battleship, blind Tic-Tac-Toe' },
    detail: {
      th: 'ไม่มีโชค แต่ไม่เห็นข้อมูลบางส่วนของคู่แข่ง จึงต้องคิดบน "belief state" คือชุดของสถานะที่เป็นไปได้ทั้งหมด แทนสถานะจริง',
      en: "There is no luck, but part of the opponent's information is hidden, so the agent reasons over a belief state (the set of all possible states) instead of the true state.",
    },
    algo: { th: 'ค้นหาบน belief state', en: 'Search over belief states' },
  },
  {
    key: 'chance-imperfect', row: 'imperfect', col: 'chance',
    examples: { th: 'บริดจ์, โป๊กเกอร์, สแครบเบิล', en: 'Bridge, poker, Scrabble' },
    detail: {
      th: 'ไพ่ของคู่แข่งถูกซ่อนไว้ และการแจกไพ่ก็สุ่ม ยากที่สุดในสี่แบบ การตัดสินใจที่ดีต้องคำนึงถึงข้อมูลที่ตัวเองรู้ การหาข้อมูล และการปิดบังข้อมูล',
      en: "Opponents' cards are hidden and the deal is random: the hardest of the four. Good play must account for what you know, gathering information and hiding it.",
    },
    algo: { th: 'Belief state + ความน่าจะเป็น (เช่น สุ่มแจกไพ่จำลองแบบ GIB)', en: 'Belief states + probability (e.g. sampling deals like GIB)' },
  },
];

export function GameTypesMatrix() {
  const { t, lang } = useLang();
  const [sel, setSel] = useState('det-perfect');
  const cur = TYPES.find((x) => x.key === sel)!;
  const cell = (row: string, col: string) => {
    const x = TYPES.find((y) => y.row === row && y.col === col)!;
    return (
      <button className={`matrix-cell ${sel === x.key ? 'on' : ''}`} onClick={() => setSel(x.key)} aria-pressed={sel === x.key}>
        {x.examples[lang]}
        {x.key === 'det-perfect' && <span className="here">{t('Tic-Tac-Toe อยู่ตรงนี้', 'Tic-Tac-Toe is here')}</span>}
      </button>
    );
  };
  return (
    <div className="widget">
      <div className="matrix">
        <div />
        <div className="matrix-head">deterministic<br /><span className="muted">{t('ไม่มีโชค', 'no luck')}</span></div>
        <div className="matrix-head">chance<br /><span className="muted">{t('มีโชค / การสุ่ม', 'dice / randomness')}</span></div>
        <div className="matrix-side">perfect information<br /><span className="muted">{t('เห็นข้อมูลครบ', 'everything visible')}</span></div>
        {cell('perfect', 'det')}
        {cell('perfect', 'chance')}
        <div className="matrix-side">imperfect information<br /><span className="muted">{t('เห็นข้อมูลไม่ครบ', 'something hidden')}</span></div>
        {cell('imperfect', 'det')}
        {cell('imperfect', 'chance')}
      </div>
      <div className="calc" style={{ marginTop: 14 }}>
        <div>{cur.detail[lang]}</div>
        <div style={{ marginTop: 6 }}><b>{t('อัลกอริทึมที่ใช้:', 'Algorithm:')}</b> {cur.algo[lang]}</div>
      </div>
      <p className="widget-hint">{t('คลิกแต่ละช่องเพื่อดูคำอธิบาย', 'Click a cell for an explanation.')}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Properties quiz (click to reveal, like the "??" in the slides)
// ---------------------------------------------------------------------------

export interface QA { q: ReactNode; a: ReactNode }

export function RevealCards({ items }: { items: QA[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState<boolean[]>(() => items.map(() => false));
  return (
    <div className="reveal-grid">
      {items.map((it, i) => (
        <button
          key={i}
          className={`reveal ${open[i] ? 'open' : ''}`}
          onClick={() => setOpen((o) => o.map((v, k) => (k === i ? !v : v)))}
          aria-expanded={open[i]}
        >
          <span className="reveal-q">{it.q}</span>
          {open[i] ? <span className="reveal-a">{it.a}</span> : <span className="reveal-hint">{t('ลองคิดก่อน แล้วแตะเพื่อดูคำตอบ', 'Think first, then tap to reveal')}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. How deep can we search? (resource limits)
// ---------------------------------------------------------------------------

const B_PRESETS: { th: string; en: string; b: number }[] = [
  { th: 'Tic-Tac-Toe', en: 'Tic-Tac-Toe', b: 5 },
  { th: 'หมากรุก', en: 'Chess', b: 35 },
  { th: 'แบ็กแกมมอน (รวมลูกเต๋า)', en: 'Backgammon (with dice)', b: 420 },
  { th: 'โกะ', en: 'Go', b: 250 },
];

export function DepthCalculator() {
  const { t, lang } = useLang();
  const [b, setB] = useState(35);
  const [rateExp, setRateExp] = useState(4); // nodes/sec = 10^rateExp
  const [seconds, setSeconds] = useState(100);

  const nodes = 10 ** rateExp * seconds;
  const dMinimax = Math.log(nodes) / Math.log(b);
  const dAB = 2 * dMinimax;
  const maxBar = 24;
  const [mant, exp] = nodes.toExponential(1).split('e+');

  return (
    <div className="widget">
      <div className="widget-controls">
        {B_PRESETS.map((p) => (
          <button key={p.b} className={`btn ${b === p.b ? 'primary' : ''}`} onClick={() => setB(p.b)}>{p[lang]} (b≈{p.b})</button>
        ))}
      </div>
      <div className="slider-grid three">
        <label className="slider">
          <span>branching factor b = <b className="mono">{b}</b></span>
          <input type="range" min={2} max={420} value={b} onChange={(e) => setB(Number(e.target.value))} />
        </label>
        <label className="slider">
          <span>{t('ความเร็ว', 'Speed')} = <b className="mono">10<sup>{rateExp}</sup></b> {t('node/วินาที', 'nodes/s')}</span>
          <input type="range" min={2} max={9} value={rateExp} onChange={(e) => setRateExp(Number(e.target.value))} />
        </label>
        <label className="slider">
          <span>{t('เวลาต่อตา', 'Time per move')} = <b className="mono">{seconds}</b> {t('วินาที', 's')}</span>
          <input type="range" min={1} max={600} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} />
        </label>
      </div>
      <div className="calc">
        <div>
          {t('ค้นได้ทั้งหมด ≈', 'Search budget ≈')} <b className="mono">{mant} × 10<sup>{exp}</sup></b> {t('node ต่อตา', 'nodes per move')}
        </div>
        <div className="depth-bars">
          <div className="depth-row">
            <span>Minimax: b<sup>m</sup> ≤ N</span>
            <div className="bar"><div style={{ width: `${Math.min(100, (dMinimax / maxBar) * 100)}%` }} /></div>
            <b className="mono">{dMinimax.toFixed(1)} ply</b>
          </div>
          <div className="depth-row">
            <span>α–β {t('(เรียงดีที่สุด)', '(perfect ordering)')}: b<sup>m/2</sup> ≤ N</span>
            <div className="bar"><div style={{ width: `${Math.min(100, (dAB / maxBar) * 100)}%`, background: 'var(--x)' }} /></div>
            <b className="mono">{dAB.toFixed(1)} ply</b>
          </div>
        </div>
        <div className="muted small">
          {t(
            <>ตัวอย่างในสไลด์: 100 วินาที × 10<sup>4</sup> node/วินาที = 10<sup>6</sup> node ≈ 35<sup>8/2</sup> α–β จึงค้นหมากรุกได้ลึกราว 8 ply ส่วน minimax ธรรมดาได้แค่ราว 4 ply</>,
            <>Slide example: 100 s × 10<sup>4</sup> nodes/s = 10<sup>6</sup> nodes ≈ 35<sup>8/2</sup>, so α–β reaches about 8 ply in chess while plain minimax manages only about 4.</>,
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Cutoff + evaluation function on a real Tic-Tac-Toe board
// ---------------------------------------------------------------------------

/** Linear weighted evaluation: 3·X₂ + 1·X₁ − (3·O₂ + 1·O₁), where Xₙ = open lines with n X and no O. */
export function evalFeatures(b: ArrayLike<number>) {
  const f = { x2: 0, x1: 0, o2: 0, o1: 0 };
  for (const [a, c, d] of LINES) {
    let xs = 0;
    let os = 0;
    for (const v of [b[a], b[c], b[d]]) { if (v === 1) xs++; else if (v === 2) os++; }
    if (os === 0 && xs === 2) f.x2++;
    if (os === 0 && xs === 1) f.x1++;
    if (xs === 0 && os === 2) f.o2++;
    if (xs === 0 && os === 1) f.o1++;
  }
  return { ...f, value: 3 * f.x2 + f.x1 - (3 * f.o2 + f.o1) };
}

// Depth-limited values depend only on (board, remaining depth): memoise them so
// dragging the depth slider stays smooth even at depth 9 on an empty board.
const dlMemo = new Map<number, number>();
function depthLimited(b: Cell[], depth: number, p: Player): number {
  const key = boardKey(b) * 10 + depth;
  const hit = dlMemo.get(key);
  if (hit !== undefined) return hit;
  const w = winner(b);
  const { empty } = countMarks(b);
  let v: number;
  if (w === 1) v = 100 + empty;
  else if (w === 2) v = -(100 + empty);
  else if (empty === 0) v = 0;
  else if (depth === 0) v = evalFeatures(b).value;
  else {
    v = p === 1 ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = p;
      const c = depthLimited(b, depth - 1, other(p));
      b[i] = 0;
      v = p === 1 ? Math.max(v, c) : Math.min(v, c);
    }
  }
  dlMemo.set(key, v);
  return v;
}

const PRESETS: { th: string; en: string; board: Board }[] = [
  { th: 'กระดานว่าง', en: 'Empty board', board: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { th: 'กับดักมุมทแยง (ตา O)', en: 'Opposite-corner trap (O to move)', board: [1, 0, 0, 0, 2, 0, 0, 0, 1] },
  { th: 'O ตอบขอบ X บีบชนะได้ (ตา X)', en: 'O answered on an edge, X can force a win (X to move)', board: [0, 2, 0, 0, 1, 0, 0, 0, 0] },
  { th: 'ต้องกัน (ตา O)', en: 'Must block (O to move)', board: [1, 1, 0, 0, 2, 0, 0, 0, 0] },
];

export function EvalCutoffDemo() {
  const { t, m, lang } = useLang();
  const [board, setBoard] = useState<Board>(PRESETS[1].board);
  const [depth, setDepth] = useState(1);

  const status = boardStatus(board);
  const feats = evalFeatures(board);
  const mover: Player | null = status.kind === 'playing' ? status.toMove : null;

  const result = useMemo(() => {
    if (!mover) return null;
    const b = board.slice() as Cell[];
    const sign = mover === 1 ? 1 : -1;
    const cells: { cell: number; v: number }[] = [];
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = mover;
      cells.push({ cell: i, v: sign * depthLimited(b, depth - 1, other(mover)) });
      b[i] = 0;
    }
    const top = Math.max(...cells.map((c) => c.v));
    const chosen = cells.find((c) => c.v === top)!.cell;
    const perfect = analyzeMoves(board, mover);
    const perfectBest = new Set(perfect.filter((x) => x.best).map((x) => x.cell));
    const outcome = perfect.find((x) => x.cell === chosen)!.outcome;
    return { cells: new Map(cells.map((c) => [c.cell, c.v])), chosen, perfectBest, outcome, bestOutcome: perfect.find((x) => x.best)!.outcome };
  }, [board, depth, mover]);

  const cycle = (i: number) => {
    const next = board.slice() as Board;
    next[i] = ((next[i] + 1) % 3) as Cell;
    setBoard(next);
  };

  const verdict = () => {
    if (!result || !mover) return null;
    const ok = result.perfectBest.has(result.chosen);
    const best = [...result.perfectBest].map((c) => c + 1).join(', ');
    const res = { lose: t('แพ้', 'lose'), draw: t('ได้แค่เสมอ', 'only draw'), win: t('ชนะช้าลง', 'win more slowly') }[result.outcome];
    const should = result.bestOutcome === 'win' ? t('ชนะ', 'win') : t('เสมอ', 'draw');
    return (
      <div className={`status ${ok ? 'good' : 'error'}`}>
        <strong>
          {t(
            `ตา ${symbol(mover)}: ค้นลึก ${depth} ply แล้วใช้ Eval จะเลือกช่อง ${result.chosen + 1}`,
            `${symbol(mover)} to move: searching ${depth} ply and applying Eval picks cell ${result.chosen + 1}`,
          )}
        </strong>
        {ok
          ? t('ตรงกับตาที่ดีที่สุดจริง (★) จาก minimax เต็มต้น', 'This matches the true best move (★) from full minimax.')
          : t(
              `แต่ตาที่ดีที่สุดจริงคือช่อง ${best} (★) ตาที่เลือกจะทำให้${res} ทั้งที่ควร${should}ได้ ลองเพิ่มความลึกดู`,
              `But the true best move is cell ${best} (★). The chosen move would ${res} when it should ${should}. Try a deeper cutoff.`,
            )}
      </div>
    );
  };

  return (
    <div className="widget">
      <div className="widget-controls">
        {PRESETS.map((p) => (
          <button key={p.en} className="btn" onClick={() => setBoard(p.board)}>{p[lang]}</button>
        ))}
      </div>
      <div className="eval-layout">
        <div>
          <div className="board small">
            {board.map((c, i) => {
              const v = result?.cells.get(i);
              const chosen = result?.chosen === i;
              const perfect = result?.perfectBest.has(i);
              return (
                <button key={i} className={`cell ${c === 1 ? 'x' : c === 2 ? 'o' : ''} ${chosen ? 'chosen' : ''}`} onClick={() => cycle(i)}>
                  {c ? symbol(c) : v !== undefined && (
                    <span className="cell-score">
                      <span className="mono">{v > 50 ? t('ชนะ', 'win') : v < -50 ? t('แพ้', 'loss') : v > 0 ? `+${v}` : v}</span>
                      {perfect && <span className="star" title={t('ตาที่ดีที่สุดจริงตาม minimax เต็มต้น', 'True best move from full minimax')}>★</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="widget-hint">{t('แตะช่องเพื่อสลับ ว่าง → X → O', 'Tap a cell to cycle empty → X → O')}</p>
        </div>
        <div>
          <label className="slider">
            <span>{t('ความลึกของ cutoff', 'Cutoff depth')} = <b className="mono">{depth}</b> ply</span>
            <input type="range" min={1} max={9} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          </label>
          <div className="calc">
            <div><b>Eval(s) = 3·X₂ + 1·X₁ − (3·O₂ + 1·O₁)</b></div>
            <div className="muted small">
              {t(
                'X₂ = จำนวนแถวที่มี X สองตัวและไม่มี O, X₁ = แถวที่มี X ตัวเดียวและไม่มี O (O ก็นับแบบเดียวกัน)',
                'X₂ = number of lines with two X and no O, X₁ = lines with one X and no O (O is counted the same way).',
              )}
            </div>
            <div>
              {t('กระดานนี้:', 'This board:')} X₂ = {feats.x2}, X₁ = {feats.x1}, O₂ = {feats.o2}, O₁ = {feats.o1} → Eval ={' '}
              <b className="mono">{feats.value > 0 ? `+${feats.value}` : feats.value}</b>
              <span className="muted"> {t('(บวก = ดีกับ X)', '(positive = good for X)')}</span>
            </div>
          </div>
          {status.kind === 'invalid' && <div className="status error">{m(status.reason)}</div>}
          {status.kind === 'over' && <div className="status">{t('เกมจบแล้ว ลองเลือกตำแหน่งอื่น', 'The game is over. Try another position.')}</div>}
          {verdict()}
          <p className="widget-hint">
            {t(
              'ตัวเลขในช่องคือค่าที่ได้จากการค้นลึกแค่ cutoff แล้วใช้ Eval ประเมิน (มองจากฝั่งที่กำลังจะเดิน) ส่วน ★ คือคำตอบที่ถูกต้องจริง',
              'Numbers in the cells are the values from searching to the cutoff and applying Eval (from the mover’s point of view). ★ marks the truly correct answer.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Imperfect information: the "roads" commonsense example
// ---------------------------------------------------------------------------

const SCENARIOS: { th: string; en: string; text: T; known: boolean }[] = [
  { th: 'กรณี 1', en: 'Case 1', known: true, text: { th: 'ทาง B: แยกซ้ายเจอกองเพชร แยกขวาโดนรถบัสชน', en: 'Road B: the left fork has a mound of jewels, the right fork a bus that runs you over' } },
  { th: 'กรณี 2', en: 'Case 2', known: true, text: { th: 'ทาง B: แยกซ้ายโดนรถบัสชน แยกขวาเจอกองเพชร', en: 'Road B: the left fork has the bus, the right fork the jewels' } },
  { th: 'กรณี 3', en: 'Case 3', known: false, text: { th: 'ทาง B: ต้องเดาเอา ถ้าเดาถูกเจอกองเพชร ถ้าเดาผิดโดนรถบัสชน', en: 'Road B: you must guess: guess right and find jewels, guess wrong and get hit by the bus' } },
];

export function ImperfectInfoDemo() {
  const { t, lang } = useLang();
  const [sc, setSc] = useState(0);
  const [gold, setGold] = useState(1);
  const [jewels, setJewels] = useState(10);
  const [bus, setBus] = useState(-100);
  const s = SCENARIOS[sc];
  const avgWrong = (jewels + jewels) / 2; // average over the real states, as if you knew which fork is right
  const trueB = s.known ? jewels : 0.5 * jewels + 0.5 * bus;
  const choice = trueB > gold ? 'B' : 'A';

  return (
    <div className="widget">
      <div className="seg wrap">
        {SCENARIOS.map((x, i) => (
          <button key={i} className={`text ${sc === i ? 'on' : ''}`} onClick={() => setSc(i)}>{x[lang]}</button>
        ))}
      </div>
      <div className="calc" style={{ marginTop: 12 }}>
        <div>{t('ทาง A: เจอทองกองเล็ก', 'Road A: a small heap of gold')} · {s.text[lang]}</div>
      </div>
      <div className="slider-grid three">
        <label className="slider"><span>{t('ค่าทอง', 'Gold')} = <b className="mono">{gold}</b></span>
          <input type="range" min={0} max={20} value={gold} onChange={(e) => setGold(Number(e.target.value))} /></label>
        <label className="slider"><span>{t('ค่าเพชร', 'Jewels')} = <b className="mono">{jewels}</b></span>
          <input type="range" min={1} max={100} value={jewels} onChange={(e) => setJewels(Number(e.target.value))} /></label>
        <label className="slider"><span>{t('โดนรถบัสชน', 'Hit by the bus')} = <b className="mono">{bus}</b></span>
          <input type="range" min={-500} max={0} value={bus} onChange={(e) => setBus(Number(e.target.value))} /></label>
      </div>
      <div className="two-col">
        <div className="card mini">
          <h4>{t('คิดแบบ "เฉลี่ยทุกสถานการณ์จริง" ✗', 'Averaging over the real states ✗')}</h4>
          <p className="muted">
            {t(
              <>ในทุกสถานการณ์จริง (ซ้ายถูก / ขวาถูก) ถ้ารู้คำตอบ เราจะเลือกแยกที่ถูกเสมอ ค่าของ B จึงเท่ากับ ({jewels} + {jewels}) / 2 = <b>{avgWrong}</b></>,
              <>In every real state (left is right / right is right), knowing the answer, we would always take the good fork, so B is worth ({jewels} + {jewels}) / 2 = <b>{avgWrong}</b></>,
            )}
          </p>
          <p>→ {t('เลือก', 'choose')} <b>{avgWrong > gold ? 'B' : 'A'}</b> {t('ทุกกรณี', 'in every case')}</p>
        </div>
        <div className="card mini">
          <h4>{t('คิดตาม belief state ✓', 'Reasoning over the belief state ✓')}</h4>
          <p className="muted">
            {s.known
              ? t(`รู้อยู่แล้วว่าแยกไหนถูก ค่าของ B = ${jewels}`, `We already know which fork is right, so B = ${jewels}`)
              : t(
                  `ตอนถึงทางแยก เราไม่รู้ว่าแยกไหนถูก ค่าของ B = 0.5 × ${jewels} + 0.5 × (${bus}) = ${trueB}`,
                  `At the fork we do not know which way is right, so B = 0.5 × ${jewels} + 0.5 × (${bus}) = ${trueB}`,
                )}
          </p>
          <p>→ {t('เลือก', 'choose')} <b>{choice}</b> (A = {gold}, B = {trueB})</p>
        </div>
      </div>
      <p className="widget-hint">
        {t(
          <>กรณี 1 และ 2 เลือก B ถูกแล้ว แต่กรณี 3 การ "เฉลี่ยทุกสถานการณ์จริง" ทำเหมือนเรารู้คำตอบตอนถึงทางแยก ซึ่งไม่จริง ค่าของ action จึงต้องคิดจาก <b>ข้อมูลที่เรามีจริง ๆ (information / belief state)</b> ไม่ใช่สถานะจริงของโลก</>,
          <>In cases 1 and 2 choosing B is right. In case 3, averaging over real states pretends we will know the answer at the fork, which is false. The value of an action must be computed from <b>what we actually know (the information / belief state)</b>, not from the true state of the world.</>,
        )}
      </p>
    </div>
  );
}
