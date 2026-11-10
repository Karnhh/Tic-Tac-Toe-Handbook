import { Link } from 'react-router-dom';
import { symbol, type Cell } from '../lib/game.ts';
import { useLang } from '../i18n.tsx';

// X: 2, O: 2 → X to move; X at cell 9 completes the 1-5-9 diagonal.
const DEMO: Cell[] = [1, 2, 0, 0, 1, 0, 2, 0, 0];

export default function Home() {
  const { t } = useLang();
  return (
    <main className="page">
      <section className="hero">
        <div>
          <span className="tag">AI · Game Playing (Adversarial Search)</span>
          <h1>{t('คู่มือ Tic-Tac-Toe ด้วยหลัก Game Playing ของ AI', 'A Tic-Tac-Toe Handbook for AI Game Playing')}</h1>
          <p className="lead">
            {t(
              <>
                Tic-Tac-Toe เป็นเกมสองผู้เล่นแบบผลัดกันเดิน ที่ <b>ไม่มีโชคเข้ามาเกี่ยว</b> (deterministic),{' '}
                <b>เห็นข้อมูลครบทั้งกระดาน</b> (perfect information) และเป็น <b>zero-sum</b> (ฝ่ายหนึ่งได้เท่าไร อีกฝ่ายก็เสียเท่านั้น)
                เกมแบบนี้ใช้ <b>Minimax</b> หาตาที่ดีที่สุดได้แบบแม่นยำ เว็บนี้ให้คุณเรียนทฤษฎี ลองใช้กับกระดานจริง
                และเดินสำรวจ game tree ทั้งต้นได้
              </>,
              <>
                Tic-Tac-Toe is a two-player, turn-taking game that is <b>deterministic</b> (no luck involved),
                has <b>perfect information</b> (the whole board is visible) and is <b>zero-sum</b> (one player's gain is the other's loss).
                For games like this, <b>Minimax</b> finds the best move exactly. Learn the theory, apply it to a real board,
                and explore the entire game tree.
              </>,
            )}
          </p>
          <div className="hero-actions">
            <Link to="/theory" className="btn primary">{t('เรียนทฤษฎี →', 'Learn the theory →')}</Link>
            <Link to="/advisor" className="btn">{t('หาตาที่ดีที่สุด', 'Find the best move')}</Link>
            <Link to="/tree" className="btn">{t('สำรวจ Game Tree', 'Explore the game tree')}</Link>
          </div>
        </div>
        <div className="hero-board">
          <div className="board">
            {DEMO.map((c, i) => (
              <div key={i} className={`cell static ${c === 1 ? 'x' : c === 2 ? 'o' : ''} ${i === 8 ? 'win' : ''}`}>
                {i === 8 ? <span style={{ color: 'var(--x)', opacity: 0.45 }}>X</span> : symbol(c)}
              </div>
            ))}
          </div>
          <p className="muted hero-caption">
            {t('ถึงตา X: Minimax เลือกช่องมุมขวาล่าง ครบแนวทแยง ชนะทันที', "X to move: Minimax picks the bottom-right corner, completing the diagonal for an instant win")}
          </p>
        </div>
      </section>

      <section className="features">
        <Link to="/theory" className="card feature">
          <span className="tag">{t('เรียนทฤษฎี', 'Theory')}</span>
          <h2>{t('ทฤษฎี Game Playing', 'Game Playing theory')}</h2>
          <p className="muted">
            {t(
              'อธิบายละเอียดตั้งแต่ minimax, α–β pruning, cutoff + evaluation function, expectiminimax ไปจนถึงเกมที่ข้อมูลไม่ครบ มีแผนภาพที่ไล่ทีละขั้นได้ และตัวอย่างที่ปรับค่าเล่นเองได้',
              'A detailed walkthrough of minimax, α–β pruning, cutoffs and evaluation functions, expectiminimax and imperfect-information games, with step-by-step diagrams and demos you can tweak.',
            )}
          </p>
          <span className="go">{t('เริ่มเรียน →', 'Start learning →')}</span>
        </Link>
        <Link to="/advisor" className="card feature">
          <span className="tag">{t('ฟีเจอร์ 1', 'Feature 1')}</span>
          <h2>{t('ตาต่อไปควรลงช่องไหน', 'Where should I play next?')}</h2>
          <p className="muted">
            {t(
              'วางกระดานตามสถานการณ์ตอนนี้ แล้วเลือกว่าคุณเป็น X หรือ O ระบบจะคำนวณ minimax ให้ทุกช่องที่ยังว่าง บอกผลลัพธ์ว่า ชนะ / เสมอ / แพ้ และจะจบในกี่ตา พร้อมเทียบจำนวน node ที่ค้นระหว่าง minimax กับ α–β pruning',
              'Set up the current board and choose whether you are X or O. Every empty cell is scored with minimax as a win, draw or loss and how many plies until the game ends, plus a node-count comparison of minimax vs α–β pruning.',
            )}
          </p>
          <span className="go">{t('เปิดเครื่องมือ →', 'Open the tool →')}</span>
        </Link>
        <Link to="/tree" className="card feature">
          <span className="tag">{t('ฟีเจอร์ 2', 'Feature 2')}</span>
          <h2>{t('Game Tree ทั้งต้น', 'The complete game tree')}</h2>
          <p className="muted">
            {t(
              'ดูทุกลำดับการเดินที่เป็นไปได้ทั้ง 549,946 node ในต้นเดียว ซูมเข้าออกและลากดูได้ คลิก node ไหนก็จะไฮไลต์เส้นทางจาก root ลงมาถึง node นั้น สีของ node บอกค่า minimax ของมัน',
              'Every possible move sequence, all 549,946 nodes, in one tree. Zoom and pan freely, then click any node to highlight its path from the root. Node colours show minimax values.',
            )}
          </p>
          <span className="go">{t('เปิด Tree →', 'Open the tree →')}</span>
        </Link>
      </section>

      <section className="stats">
        <div className="card stat"><div className="num">549,946</div><div className="lbl">{t('node ใน game tree ทั้งต้น', 'nodes in the full game tree')}</div></div>
        <div className="card stat"><div className="num">255,168</div><div className="lbl">{t('รูปแบบเกมที่จบได้ (leaf)', 'distinct finished games (leaves)')}</div></div>
        <div className="card stat"><div className="num">5,478</div><div className="lbl">{t('หน้ากระดานที่เกิดขึ้นได้จริง (ไม่นับซ้ำ)', 'distinct reachable board positions')}</div></div>
        <div className="card stat"><div className="num">{t('เสมอ', 'Draw')}</div><div className="lbl">{t('ผลลัพธ์ถ้าทั้งสองฝ่ายเล่นดีที่สุด', 'result when both sides play perfectly')}</div></div>
      </section>

      <section>
        <h2 style={{ marginBottom: 16 }}>{t('ทฤษฎีที่ใช้ (สรุปสั้น)', 'The theory in brief')}</h2>
        <div className="theory">
          <div className="card">
            <h3>Minimax</h3>
            <p className="muted">
              {t(
                'MAX (X) อยากได้คะแนนสูงสุด ส่วน MIN (O) อยากได้คะแนนต่ำสุด ระบบไล่ค่าคะแนนขึ้นจาก leaf โดย node ของ MAX เลือกลูกที่มากที่สุด node ของ MIN เลือกลูกที่น้อยที่สุด ค่าที่ root จึงเป็นผลลัพธ์ที่ดีที่สุดที่การันตีได้ เมื่อเจอคู่แข่งที่เล่นเก่งที่สุด',
                'MAX (X) wants the highest score and MIN (O) the lowest. Values are backed up from the leaves: MAX nodes take the largest child value, MIN nodes the smallest. The root value is therefore the best outcome MAX can guarantee against a perfect opponent.',
              )}
            </p>
            <pre>{`function MAX-VALUE(s)
  if TERMINAL(s): return UTILITY(s)
  v ← −∞
  for each child c of s:
    v ← max(v, MIN-VALUE(c))
  return v`}</pre>
          </div>
          <div className="card">
            <h3>α–β pruning</h3>
            <p className="muted">
              {t(
                <>
                  ได้ค่าที่ root เท่ากับ minimax เสมอ แต่ข้ามกิ่งที่พิสูจน์ได้แล้วว่าไม่มีผลกับคำตอบ{' '}
                  <b>α</b> คือค่าที่ดีที่สุดที่ MAX การันตีได้แล้วบนเส้นทางจาก root ลงมาถึง node ปัจจุบัน ส่วน <b>β</b> คือค่าที่ดีที่สุดของ MIN บนเส้นทางเดียวกัน
                  ถ้าเรียงลำดับตาได้สมบูรณ์แบบ เวลาจะลดจาก O(b<sup>m</sup>) เหลือ O(b<sup>m/2</sup>) ซึ่งเท่ากับค้นได้ลึกขึ้นเป็นสองเท่า
                </>,
                <>
                  Always returns the same root value as minimax, but skips branches that provably cannot affect the answer.{' '}
                  <b>α</b> is the best value MAX can already guarantee along the path from the root to the current node; <b>β</b> is the
                  same for MIN. With perfect move ordering the time drops from O(b<sup>m</sup>) to O(b<sup>m/2</sup>), doubling the searchable depth.
                </>,
              )}
            </p>
            <pre>{`for each child c of s:
  v ← max(v, MIN-VALUE(c, α, β))
  if v ≥ β: return v      // prune
  α ← max(α, v)`}</pre>
          </div>
          <div className="card">
            <h3>{t('คะแนนที่เว็บนี้ใช้', 'Scores used on this site')}</h3>
            <p className="muted">
              {t(
                <>
                  ในตำรา utility ของ Tic-Tac-Toe คือ +1 / 0 / −1 (X ชนะ / เสมอ / O ชนะ) เว็บนี้ปรับเล็กน้อยเป็น
                  X ชนะ = +(10 + จำนวนช่องว่างที่เหลือ), O ชนะ = −(10 + ช่องว่างที่เหลือ), เสมอ = 0
                  ลำดับ ชนะ &gt; เสมอ &gt; แพ้ ยังเหมือนเดิม แต่โบนัสช่องว่างช่วยตัดสินเวลามีหลายตาที่ผลเท่ากัน คือเลือก <b>ชนะให้เร็วที่สุด</b>{' '}
                  และถ้าแพ้แน่ ๆ ก็ <b>ยื้อให้นานที่สุด</b>
                </>,
                <>
                  The textbook utility for Tic-Tac-Toe is +1 / 0 / −1 (X wins / draw / O wins). This site uses a small refinement:
                  X wins = +(10 + empty cells left), O wins = −(10 + empty cells left), draw = 0. The order win &gt; draw &gt; loss is unchanged;
                  the bonus only breaks ties between equally good moves, so the AI <b>wins as fast as possible</b> and, when lost, <b>holds out as long as possible</b>.
                </>,
              )}
            </p>
          </div>
          <div className="card">
            <h3>{t('ทำไม Tic-Tac-Toe ถึงคำนวณได้หมด', 'Why Tic-Tac-Toe can be solved completely')}</h3>
            <p className="muted">
              {t(
                'branching factor สูงสุดคือ 9 และลึกไม่เกิน 9 ตา tree ทั้งต้นจึงมีแค่ราว 5.5 แสน node คอมพิวเตอร์คำนวณเสร็จในไม่กี่สิบมิลลิวินาที ต่างจากหมากรุก (b ≈ 35, m ≈ 100) ที่ต้องตัดความลึกแล้วใช้ evaluation function ประมาณค่าแทน',
                'The branching factor is at most 9 and a game lasts at most 9 plies, so the whole tree has only about 550,000 nodes, which a computer handles in tens of milliseconds. Chess (b ≈ 35, m ≈ 100) is different: the search must be cut off and positions estimated with an evaluation function.',
              )}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
