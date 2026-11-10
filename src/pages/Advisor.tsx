import { useMemo, useState } from 'react';
import {
  analyzeMoves,
  boardKey,
  boardStatus,
  countAlphaBetaNodes,
  countMinimaxNodes,
  describeScore,
  emptyBoard,
  minimaxValue,
  other,
  principalVariation,
  symbol,
  type Board,
  type Cell,
  type MoveAnalysis,
  type Outcome,
  type Player,
} from '../lib/game.ts';
import { useLang } from '../i18n.tsx';

type Brush = 'auto' | 1 | 2 | 0;

// Node counting walks the full subtree (up to 550k nodes for an empty board),
// so cache it per board to keep every click within one frame after the first.
const nodeCache = new Map<number, { minimax: number; alphaBeta: number }>();
function nodeCounts(b: Board) {
  const k = boardKey(b);
  let v = nodeCache.get(k);
  if (!v) {
    v = { minimax: countMinimaxNodes(b), alphaBeta: countAlphaBetaNodes(b) };
    nodeCache.set(k, v);
  }
  return v;
}

export default function Advisor() {
  const { t, m, num } = useLang();
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [history, setHistory] = useState<Board[]>([]);
  const [me, setMe] = useState<Player>(1);
  const [brush, setBrush] = useState<Brush>('auto');

  const OUTCOME: Record<Outcome, string> = { win: t('ชนะ', 'Win'), draw: t('เสมอ', 'Draw'), lose: t('แพ้', 'Loss') };
  const cellName = (i: number) => t(`ช่อง ${i + 1}`, `Cell ${i + 1}`);
  const plies = (a: MoveAnalysis, long = false) =>
    a.outcome === 'draw'
      ? t(`${long ? 'เกม' : ''}จบใน ${a.pliesToEnd} ตา`, `ends in ${a.pliesToEnd} ${a.pliesToEnd === 1 ? 'ply' : 'plies'}`)
      : t(`${long ? 'ภายใน' : 'ใน'} ${a.pliesToEnd} ตา`, `in ${a.pliesToEnd} ${a.pliesToEnd === 1 ? 'ply' : 'plies'}`);

  const status = useMemo(() => boardStatus(board), [board]);
  const myTurn = status.kind === 'playing' && status.toMove === me;

  const analysis = useMemo<MoveAnalysis[] | null>(() => (myTurn ? analyzeMoves(board, me) : null), [board, me, myTurn]);
  const byCell = useMemo(() => {
    const map = new Map<number, MoveAnalysis>();
    analysis?.forEach((a) => map.set(a.cell, a));
    return map;
  }, [analysis]);

  const position = useMemo(() => {
    if (status.kind !== 'playing') return null;
    const empty = board.filter((c) => c === 0).length;
    return describeScore(minimaxValue(board.slice() as Cell[]), me, empty);
  }, [board, me, status.kind]);

  const pv = useMemo(() => (status.kind === 'playing' ? principalVariation(board) : []), [board, status.kind]);
  const nodes = useMemo(() => (status.kind === 'playing' ? nodeCounts(board) : null), [board, status.kind]);

  const commit = (next: Board) => {
    setHistory((h) => [...h, board]);
    setBoard(next);
  };

  const onCell = (i: number) => {
    const next = board.slice() as Board;
    if (brush === 'auto') {
      if (next[i] !== 0) next[i] = 0;
      else next[i] = status.kind === 'playing' ? status.toMove : nextByCount(board);
    } else {
      next[i] = next[i] === brush ? 0 : brush;
    }
    commit(next);
  };

  const playBest = (player: Player) => {
    const best = analyzeMoves(board, player).find((x) => x.best);
    if (!best) return;
    const next = board.slice() as Board;
    next[best.cell] = player;
    commit(next);
  };

  const undo = () => {
    if (!history.length) return;
    setBoard(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };

  const meClass = me === 2 ? 'me-o' : '';
  const winLine = status.kind === 'over' ? status.line : null;
  const opp = other(me);

  // ---------------------------------------------------------------- status
  let statusBox: React.ReactNode;
  if (status.kind === 'invalid') {
    statusBox = (
      <div className="status error">
        <strong>{t('กระดานนี้เกิดขึ้นจริงไม่ได้', 'This board cannot occur in a real game')}</strong>
        {m(status.reason)}
      </div>
    );
  } else if (status.kind === 'over') {
    const text =
      status.winner === 0 ? t('เกมจบแล้ว ผลคือเสมอ', 'Game over: it is a draw')
      : status.winner === me ? t('เกมจบแล้ว คุณชนะ 🎉', 'Game over: you win 🎉')
      : t(`เกมจบแล้ว ${symbol(status.winner)} ชนะ`, `Game over: ${symbol(status.winner)} wins`);
    statusBox = (
      <div className="status good">
        <strong>{text}</strong>
        {t('ล้างกระดานหรือกดย้อนกลับเพื่อลองตำแหน่งอื่น', 'Clear the board or undo to try another position.')}
      </div>
    );
  } else if (status.toMove !== me) {
    statusBox = (
      <div className="status">
        <strong>{t(`ตอนนี้เป็นตาของ ${symbol(opp)} ไม่ใช่ตาคุณ`, `It is ${symbol(opp)}'s turn, not yours`)}</strong>
        <p className="muted" style={{ margin: '4px 0 10px' }}>
          {t(
            `วางตาที่ ${symbol(opp)} เดินจริงลงบนกระดาน หรือให้ระบบเดินแทน ${symbol(opp)} แบบดีที่สุด`,
            `Place ${symbol(opp)}'s actual move on the board, or let the engine play ${symbol(opp)}'s best move.`,
          )}
        </p>
        <div className="btn-row">
          <button className="btn" onClick={() => playBest(opp)}>{t(`ให้ ${symbol(opp)} เดินตาที่ดีที่สุด`, `Play ${symbol(opp)}'s best move`)}</button>
          <button className="btn" onClick={() => setMe(opp)}>{t(`สลับไปเป็น ${symbol(opp)}`, `Switch to ${symbol(opp)}`)}</button>
        </div>
      </div>
    );
  } else {
    const n = position?.pliesToEnd ?? 0;
    const summary =
      position?.outcome === 'win' ? t(`ถ้าเล่นถูก คุณชนะได้ภายใน ${n} ตา`, `With correct play you win within ${n} plies.`)
      : position?.outcome === 'draw' ? t('ถ้าทั้งสองฝ่ายเล่นดีที่สุด เกมนี้จะเสมอ', 'If both sides play perfectly, this game is a draw.')
      : t(`ถ้าคู่แข่งเล่นไม่พลาด คุณแพ้แน่นอน แต่ยื้อได้ ${n} ตา`, `If your opponent makes no mistake you will lose, but you can hold out for ${n} plies.`);
    statusBox = (
      <div className="status good">
        <strong>{t(`ถึงตาคุณ (${symbol(me)})`, `Your turn (${symbol(me)})`)}</strong>
        <p className="muted" style={{ margin: '4px 0 10px' }}>{summary}</p>
        <button className="btn primary" onClick={() => playBest(me)}>{t('ลงช่องที่แนะนำ', 'Play the recommended move')}</button>
      </div>
    );
  }

  return (
    <main className="page">
      <h1>{t('ตาต่อไปควรลงช่องไหน', 'Where should I play next?')}</h1>
      <p className="muted intro">
        {t(
          'วางกระดานตามเกมที่เล่นอยู่ตอนนี้ แล้วเลือกว่าคุณเป็นฝ่ายไหน ถ้าถึงตาคุณ ทุกช่องว่างจะแสดงผลลัพธ์ตาม minimax สมมติว่าหลังจากนั้นทั้งสองฝ่ายเล่นดีที่สุด ช่องที่มีกรอบสีม่วงคือตาที่ทฤษฎีแนะนำ',
          'Set up the board from the game you are playing and choose your side. On your turn, every empty cell shows its minimax result, assuming both sides play perfectly from then on. Cells with a purple ring are the recommended moves.',
        )}
      </p>

      <div className="advisor">
        <div>
          <div className="toolbar">
            <span className="muted label">{t('ฉันเป็น', 'I am')}</span>
            <div className="seg">
              <button className={me === 1 ? 'on x' : ''} onClick={() => setMe(1)}>X</button>
              <button className={me === 2 ? 'on o' : ''} onClick={() => setMe(2)}>O</button>
            </div>
          </div>
          <div className="toolbar">
            <span className="muted label">{t('วางตัว', 'Place')}</span>
            <div className="seg">
              <button className={`text ${brush === 'auto' ? 'on' : ''}`} onClick={() => setBrush('auto')}>{t('ตามตา', 'Turn order')}</button>
              <button className={brush === 1 ? 'on x' : ''} onClick={() => setBrush(1)}>X</button>
              <button className={brush === 2 ? 'on o' : ''} onClick={() => setBrush(2)}>O</button>
              <button className={`text ${brush === 0 ? 'on' : ''}`} onClick={() => setBrush(0)}>{t('ลบ', 'Erase')}</button>
            </div>
          </div>

          <div className="board" role="grid" aria-label={t('กระดาน Tic-Tac-Toe', 'Tic-Tac-Toe board')}>
            {board.map((c, i) => {
              const a = byCell.get(i);
              if (a && c === 0) {
                return (
                  <button
                    key={i}
                    className={`cell hint ${a.outcome} ${meClass} ${a.best ? 'best' : ''}`}
                    onClick={() => onCell(i)}
                    title={t(`ลง ${symbol(me)} ที่${cellName(i)}`, `Play ${symbol(me)} in ${cellName(i)}`)}
                  >
                    <span className="idx">{i + 1}</span>
                    {a.best && <span className="best-badge">{t('แนะนำ', 'Best')}</span>}
                    <span className="hint-label">{OUTCOME[a.outcome]}</span>
                    <span className="hint-sub">{plies(a)}</span>
                  </button>
                );
              }
              return (
                <button key={i} className={`cell ${c === 1 ? 'x' : c === 2 ? 'o' : ''} ${winLine?.includes(i) ? 'win' : ''}`} onClick={() => onCell(i)}>
                  <span className="idx">{i + 1}</span>
                  {symbol(c)}
                </button>
              );
            })}
          </div>

          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="btn" onClick={undo} disabled={!history.length}>↶ {t('ย้อนกลับ', 'Undo')}</button>
            <button className="btn" onClick={() => commit(emptyBoard())} disabled={board.every((c) => c === 0)}>{t('ล้างกระดาน', 'Clear board')}</button>
          </div>
          <p className="help">
            {t(
              <>โหมด <b>ตามตา</b> จะวาง X หรือ O ให้อัตโนมัติตามลำดับการเดินจริง คลิกช่องที่มีตัวอยู่แล้วเพื่อลบ ถ้าอยากวางเองแบบอิสระ ให้เลือก X / O / ลบ</>,
              <><b>Turn order</b> mode places X or O automatically, following the real move order. Click an occupied cell to clear it. To place marks freely, pick X / O / Erase.</>,
            )}
          </p>
          <p className="help">
            {t(
              <>
                <b>ความหมายของผลลัพธ์:</b> <b>ชนะ</b> = ถ้าคุณเล่นถูกต่อจากนี้ ชนะได้แน่นอนไม่ว่าคู่แข่งจะเดินอย่างไร ·{' '}
                <b>เสมอ</b> = ถ้าทั้งสองฝ่ายเล่นดีที่สุด ผลคือเสมอ · <b>แพ้</b> = ถ้าคู่แข่งเล่นไม่พลาด คุณแพ้แน่นอน (แต่ถ้าคู่แข่งพลาด ก็ยังมีโอกาส) ·{' '}
                <b>"ตา"</b> ในที่นี้คือการเดินหนึ่งครั้งของฝ่ายใดฝ่ายหนึ่ง (1 ply) นับรวมตาที่คุณกำลังจะลงด้วย
              </>,
              <>
                <b>What the results mean:</b> <b>Win</b> = with correct play from here you win no matter what the opponent does ·{' '}
                <b>Draw</b> = with perfect play on both sides the game is drawn · <b>Loss</b> = if the opponent makes no mistake you lose (a mistake could still save you) ·{' '}
                a <b>ply</b> is one move by either player, counting the move you are about to make.
              </>,
            )}
          </p>
        </div>

        <div className="results">
          {statusBox}

          {analysis && (
            <>
              <h3>{t('คะแนนของแต่ละช่อง', 'Score of each cell')}</h3>
              <ul className="move-list">
                {[...analysis]
                  .sort((a, b) => b.score - a.score || a.cell - b.cell)
                  .map((a) => (
                    <li key={a.cell} className={a.best ? 'best' : ''}>
                      <span className="mono">{cellName(a.cell)}</span>
                      <span>
                        <span className={`pill ${a.outcome} ${meClass}`}>{OUTCOME[a.outcome]}</span>{' '}
                        <span className="muted">{plies(a, true)}</span>
                      </span>
                      <span className="mono muted" title={t('คะแนน minimax จากมุมของคุณ', 'Minimax score from your point of view')}>
                        {a.score > 0 ? `+${a.score}` : a.score}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}

          {pv.length > 0 && (
            <>
              <h3>{t('ลำดับการเดินที่คาดไว้ (ถ้าทั้งสองฝ่ายเล่นดีที่สุด)', 'Expected line of play (both sides perfect)')}</h3>
              <div className="pv">
                {pv.map((mv, k) => (
                  <span key={k}><b className={mv.player === 1 ? 'x' : 'o'}>{symbol(mv.player)}</b> → {mv.cell + 1}</span>
                ))}
              </div>
            </>
          )}

          {nodes && (
            <>
              <h3>{t('จำนวน node ที่ต้องค้นจากกระดานนี้', 'Nodes searched from this board')}</h3>
              <div className="compare">
                <div className="card">
                  <div className="muted small">{t('Minimax ธรรมดา', 'Plain minimax')}</div>
                  <div className="num">{num(nodes.minimax)}</div>
                  <div className="bar"><div style={{ width: '100%' }} /></div>
                </div>
                <div className="card">
                  <div className="muted small">α–β pruning</div>
                  <div className="num">{num(nodes.alphaBeta)}</div>
                  <div className="bar"><div style={{ width: `${(nodes.alphaBeta / nodes.minimax) * 100}%` }} /></div>
                </div>
              </div>
              <p className="help">
                {t(
                  `α–β ได้ค่า minimax ที่ root เท่ากันทุกครั้ง แต่ค้นเพียง ${((nodes.alphaBeta / nodes.minimax) * 100).toFixed(1)}% ของ node เพราะข้ามกิ่งที่พิสูจน์ได้แล้วว่าไม่มีผลกับผลลัพธ์ (ตัวเลขนี้ไล่ลูกตามลำดับช่อง 1→9 ถ้าเรียงลำดับตาให้ดีกว่านี้ จะตัดกิ่งได้มากขึ้นอีก)`,
                  `α–β always reaches the same root value as minimax but searches only ${((nodes.alphaBeta / nodes.minimax) * 100).toFixed(1)}% of the nodes, because it skips branches that provably cannot change the result. (Children are tried in cell order 1→9; better move ordering would prune even more.)`,
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function nextByCount(b: Board): Player {
  const x = b.filter((c) => c === 1).length;
  const o = b.filter((c) => c === 2).length;
  return x <= o ? 1 : 2;
}
