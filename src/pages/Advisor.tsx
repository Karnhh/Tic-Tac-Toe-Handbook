import { useMemo, useState } from 'react';
import {
  analyzeMoves,
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

type Brush = 'auto' | 1 | 2 | 0;

const OUTCOME_TH: Record<Outcome, string> = { win: 'ชนะ', draw: 'เสมอ', lose: 'แพ้' };
const cellName = (i: number) => `ช่อง ${i + 1}`;

export default function Advisor() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [history, setHistory] = useState<Board[]>([]);
  const [me, setMe] = useState<Player>(1);
  const [brush, setBrush] = useState<Brush>('auto');

  const status = useMemo(() => boardStatus(board), [board]);
  const myTurn = status.kind === 'playing' && status.toMove === me;

  const analysis = useMemo<MoveAnalysis[] | null>(
    () => (myTurn ? analyzeMoves(board, me) : null),
    [board, me, myTurn],
  );
  const byCell = useMemo(() => {
    const m = new Map<number, MoveAnalysis>();
    analysis?.forEach((a) => m.set(a.cell, a));
    return m;
  }, [analysis]);

  const position = useMemo(() => {
    if (status.kind !== 'playing') return null;
    const empty = board.filter((c) => c === 0).length;
    return describeScore(minimaxValue(board.slice() as Cell[]), me, empty);
  }, [board, me, status.kind]);

  const pv = useMemo(() => (status.kind === 'playing' ? principalVariation(board) : []), [board, status.kind]);

  const nodes = useMemo(() => {
    if (status.kind !== 'playing') return null;
    return { minimax: countMinimaxNodes(board), alphaBeta: countAlphaBetaNodes(board) };
  }, [board, status.kind]);

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
    const moves = analyzeMoves(board, player);
    const best = moves.find((m) => m.best);
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

  return (
    <main className="page">
      <h1>ตาต่อไปควรลงช่องไหน</h1>
      <p className="muted" style={{ maxWidth: '70ch', marginBottom: 28 }}>
        วางกระดานตามเกมที่เล่นอยู่ตอนนี้ แล้วเลือกว่าคุณเป็นฝ่ายไหน ถ้าถึงตาคุณ ทุกช่องว่างจะแสดงผลลัพธ์ตาม minimax
        สมมติว่าหลังจากนั้นทั้งสองฝ่ายเล่นดีที่สุด ช่องที่มีกรอบสีม่วงคือตาที่ทฤษฎีแนะนำ
      </p>

      <div className="advisor">
        <div>
          <div className="toolbar">
            <span className="muted" style={{ fontSize: 14 }}>ฉันเป็น</span>
            <div className="seg">
              <button className={me === 1 ? 'on x' : ''} onClick={() => setMe(1)}>X</button>
              <button className={me === 2 ? 'on o' : ''} onClick={() => setMe(2)}>O</button>
            </div>
          </div>
          <div className="toolbar">
            <span className="muted" style={{ fontSize: 14 }}>วางตัว</span>
            <div className="seg">
              <button className={`text ${brush === 'auto' ? 'on' : ''}`} onClick={() => setBrush('auto')}>ตามตา</button>
              <button className={brush === 1 ? 'on x' : ''} onClick={() => setBrush(1)}>X</button>
              <button className={brush === 2 ? 'on o' : ''} onClick={() => setBrush(2)}>O</button>
              <button className={`text ${brush === 0 ? 'on' : ''}`} onClick={() => setBrush(0)}>ลบ</button>
            </div>
          </div>

          <div className="board" role="grid" aria-label="กระดาน Tic-Tac-Toe">
            {board.map((c, i) => {
              const a = byCell.get(i);
              if (a && c === 0) {
                return (
                  <button
                    key={i}
                    className={`cell hint ${a.outcome} ${meClass} ${a.best ? 'best' : ''}`}
                    onClick={() => onCell(i)}
                    title={`ลง ${symbol(me)} ที่${cellName(i)}`}
                  >
                    <span className="idx">{i + 1}</span>
                    {a.best && <span className="best-badge">แนะนำ</span>}
                    <span className="hint-label">{OUTCOME_TH[a.outcome]}</span>
                    <span className="hint-sub">{a.outcome === 'draw' ? `จบใน ${a.pliesToEnd} ตา` : `ใน ${a.pliesToEnd} ตา`}</span>
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  className={`cell ${c === 1 ? 'x' : c === 2 ? 'o' : ''} ${winLine?.includes(i) ? 'win' : ''}`}
                  onClick={() => onCell(i)}
                >
                  <span className="idx">{i + 1}</span>
                  {symbol(c)}
                </button>
              );
            })}
          </div>

          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="btn" onClick={undo} disabled={!history.length}>↶ ย้อนกลับ</button>
            <button className="btn" onClick={() => commit(emptyBoard())} disabled={board.every((c) => c === 0)}>
              ล้างกระดาน
            </button>
          </div>
          <p className="help">
            โหมด <b>ตามตา</b> จะวาง X หรือ O ให้อัตโนมัติตามลำดับการเดินจริง คลิกช่องที่มีตัวอยู่แล้วเพื่อลบ
            ถ้าอยากวางเองแบบอิสระ ให้เลือก X / O / ลบ
          </p>
        </div>

        <div className="results">
          <StatusBox
            status={status}
            me={me}
            onPlayBest={playBest}
            onSwitch={() => setMe(other(me))}
            outcome={position}
          />

          {analysis && (
            <>
              <h3>คะแนนของแต่ละช่อง</h3>
              <ul className="move-list">
                {[...analysis]
                  .sort((a, b) => b.score - a.score || a.cell - b.cell)
                  .map((a) => (
                    <li key={a.cell} className={a.best ? 'best' : ''}>
                      <span className="mono">{cellName(a.cell)}</span>
                      <span>
                        <span className={`pill ${a.outcome} ${meClass}`}>{OUTCOME_TH[a.outcome]}</span>{' '}
                        <span className="muted">
                          {a.outcome === 'draw' ? `เกมจบใน ${a.pliesToEnd} ตา` : `ภายใน ${a.pliesToEnd} ตา`}
                        </span>
                      </span>
                      <span className="mono muted" title="คะแนน minimax จากมุมของคุณ">{a.score > 0 ? `+${a.score}` : a.score}</span>
                    </li>
                  ))}
              </ul>
            </>
          )}

          {pv.length > 0 && (
            <>
              <h3>ลำดับการเดินที่คาดไว้ (ถ้าทั้งสองฝ่ายเล่นดีที่สุด)</h3>
              <div className="pv">
                {pv.map((m, k) => (
                  <span key={k}>
                    <b className={m.player === 1 ? 'x' : 'o'}>{symbol(m.player)}</b> → {m.cell + 1}
                  </span>
                ))}
              </div>
            </>
          )}

          {nodes && (
            <>
              <h3>จำนวน node ที่ต้องค้นจากกระดานนี้</h3>
              <div className="compare">
                <div className="card">
                  <div className="muted" style={{ fontSize: 13 }}>Minimax ธรรมดา</div>
                  <div className="num">{nodes.minimax.toLocaleString()}</div>
                  <div className="bar"><div style={{ width: '100%' }} /></div>
                </div>
                <div className="card">
                  <div className="muted" style={{ fontSize: 13 }}>α–β pruning</div>
                  <div className="num">{nodes.alphaBeta.toLocaleString()}</div>
                  <div className="bar"><div style={{ width: `${(nodes.alphaBeta / nodes.minimax) * 100}%` }} /></div>
                </div>
              </div>
              <p className="help">
                α–β ให้คำตอบเดียวกับ minimax ทุกครั้ง แต่ค้นเพียง{' '}
                {((nodes.alphaBeta / nodes.minimax) * 100).toFixed(1)}% ของ node เพราะตัดกิ่งที่ไม่มีผลกับผลลัพธ์ทิ้งไป
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

function StatusBox({
  status,
  me,
  outcome,
  onPlayBest,
  onSwitch,
}: {
  status: ReturnType<typeof boardStatus>;
  me: Player;
  outcome: { outcome: Outcome; pliesToEnd: number } | null;
  onPlayBest: (p: Player) => void;
  onSwitch: () => void;
}) {
  if (status.kind === 'invalid') {
    return (
      <div className="status error">
        <strong>กระดานนี้เกิดขึ้นจริงไม่ได้</strong>
        {status.reason}
      </div>
    );
  }
  if (status.kind === 'over') {
    const text =
      status.winner === 0 ? 'เกมจบแล้ว ผลคือเสมอ' : status.winner === me ? 'เกมจบแล้ว คุณชนะ 🎉' : `เกมจบแล้ว ${symbol(status.winner)} ชนะ`;
    return (
      <div className="status good">
        <strong>{text}</strong>
        ล้างกระดานหรือกดย้อนกลับเพื่อลองตำแหน่งอื่น
      </div>
    );
  }
  const opp = other(me);
  if (status.toMove !== me) {
    return (
      <div className="status">
        <strong>ตอนนี้เป็นตาของ {symbol(opp)} ไม่ใช่ตาคุณ</strong>
        <p className="muted" style={{ margin: '4px 0 10px' }}>
          วางตาที่ {symbol(opp)} เดินจริงลงบนกระดาน หรือให้ระบบเดินแทน {symbol(opp)} แบบดีที่สุด
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => onPlayBest(opp)}>ให้ {symbol(opp)} เดินตาที่ดีที่สุด</button>
          <button className="btn" onClick={onSwitch}>สลับไปเป็น {symbol(opp)}</button>
        </div>
      </div>
    );
  }
  const summary =
    outcome?.outcome === 'win'
      ? `ถ้าเล่นถูก คุณชนะได้ภายใน ${outcome.pliesToEnd} ตา`
      : outcome?.outcome === 'draw'
        ? 'ถ้าทั้งสองฝ่ายเล่นดีที่สุด เกมนี้จะเสมอ'
        : `ถ้าคู่แข่งเล่นไม่พลาด คุณแพ้แน่นอน แต่ยื้อได้ ${outcome?.pliesToEnd} ตา`;
  return (
    <div className="status good">
      <strong>ถึงตาคุณ ({symbol(me)})</strong>
      <p className="muted" style={{ margin: '4px 0 10px' }}>{summary}</p>
      <button className="btn primary" onClick={() => onPlayBest(me)}>ลงช่องที่แนะนำ</button>
    </div>
  );
}
