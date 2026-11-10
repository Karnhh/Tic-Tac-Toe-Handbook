import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SearchStepper from '../components/theory/SearchStepper.tsx';
import { ExpectiminimaxDemo, ValueTransformDemo } from '../components/theory/ChanceDemos.tsx';
import { DepthCalculator, EvalCutoffDemo, GameTypesMatrix, ImperfectInfoDemo, RevealCards } from '../components/theory/Widgets.tsx';
import { useLang } from '../i18n.tsx';

const TOC: [string, string, string][] = [
  ['games', 'เกม vs ปัญหาค้นหา', 'Games vs search'],
  ['types', 'ประเภทของเกม', 'Types of games'],
  ['formal', 'นิยามเกม', 'Formal definition'],
  ['minimax', 'Minimax', 'Minimax'],
  ['minimax-props', 'คุณสมบัติ Minimax', 'Minimax properties'],
  ['alphabeta', 'α–β pruning', 'α–β pruning'],
  ['ab-props', 'คุณสมบัติ α–β', 'α–β properties'],
  ['limits', 'Cutoff + Eval', 'Cutoff + Eval'],
  ['chance', 'เกมที่มีโอกาส', 'Games of chance'],
  ['values', 'ค่าที่แน่นอนสำคัญไหม', 'Do exact values matter?'],
  ['imperfect', 'ข้อมูลไม่ครบ', 'Imperfect information'],
  ['summary', 'สรุป', 'Summary'],
];

/** Numbered section heading (`id` is kept on the <section> for anchors). */
function H({ n, th, en }: { id?: string; n: number; th: string; en: string }) {
  const { t } = useLang();
  return <h2><span className="num">{String(n).padStart(2, '0')}</span>{t(th, en)}</h2>;
}

export default function Theory() {
  const { t } = useLang();

  // the page renders after the browser's own hash jump, so scroll manually
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <main className="page theory-page">
      <header className="theory-hero">
        <span className="tag">{t('AIMA บทที่ 6', 'AIMA Chapter 6')}</span>
        <h1>{t('ทฤษฎี Game Playing', 'Game Playing Theory')}</h1>
        <p className="lead muted">
          {t(
            'เวลาคอมพิวเตอร์ต้องเล่นเกมกับคู่แข่ง มันตัดสินใจอย่างไร? หน้านี้อธิบายตั้งแต่ minimax, α–β pruning, การประมาณค่าเมื่อเวลาไม่พอ, เกมที่มีโชค ไปจนถึงเกมที่ข้อมูลไม่ครบ ทุกหัวข้อมีตัวอย่างที่กดเล่นได้',
            'How does a computer decide what to do when it plays against an opponent? This page covers minimax, α–β pruning, approximating when time runs out, games of chance and games of imperfect information, each with an example you can play with.',
          )}
        </p>
        <div className="callout note">
          {t(
            <><b>หมายเหตุ:</b> Game Playing ในที่นี้คือ <b>adversarial search</b> ใน AI คือการค้นหาตาเดินเมื่อมีคู่แข่ง ซึ่ง<b>ไม่ใช่</b> Game Theory (ทฤษฎีเกม) ทางเศรษฐศาสตร์ที่ศึกษาเรื่องอย่าง Nash equilibrium แม้จะมีแนวคิดร่วมกันบางส่วน เช่น zero-sum</>,
            <><b>Note:</b> "Game playing" here means <b>adversarial search</b> in AI, i.e. searching for moves against an opponent. It is <b>not</b> economic Game Theory (Nash equilibria and so on), although the two share some ideas such as zero-sum games.</>,
          )}
        </div>
        <nav className="toc" aria-label={t('สารบัญ', 'Contents')}>
          {TOC.map(([id, th, en], i) => (
            <a key={id} href={`#${id}`}><span className="mono">{String(i + 1).padStart(2, '0')}</span>{t(th, en)}</a>
          ))}
        </nav>
      </header>

      {/* 1 ------------------------------------------------------------------ */}
      <section id="games" className="t-section">
        <H id="games" n={1} th="เกมต่างจากปัญหาค้นหาทั่วไปอย่างไร" en="How games differ from search problems" />
        <div className="two-col">
          <div>
            <p>
              {t(
                <>ในปัญหาค้นหาทั่วไป (เช่น หาเส้นทางในแผนที่) คำตอบคือ <b>ลำดับการกระทำ</b> ที่ไปถึงเป้าหมาย แต่ในเกมมี <b>คู่แข่งที่คาดเดาไม่ได้</b> เราจึงวางแผนตายตัวล่วงหน้าไม่ได้ คำตอบต้องเป็น <b>กลยุทธ์ (strategy)</b> ที่บอกว่าเราจะเดินอะไร สำหรับทุกตาที่คู่แข่งอาจตอบกลับมา</>,
                <>In an ordinary search problem (say, route finding) the solution is a <b>sequence of actions</b> that reaches the goal. In a game there is an <b>unpredictable opponent</b>, so no fixed plan works. The solution must be a <b>strategy</b> that specifies our move for every possible opponent reply.</>,
              )}
            </p>
            <p>
              {t(
                <>อีกเรื่องคือ <b>เวลาจำกัด</b> เกมจริงอย่างหมากรุกมี game tree ใหญ่เกินกว่าจะค้นจนจบเกมได้ จึงต้อง <b>ประมาณค่า</b> แทนการหาคำตอบที่สมบูรณ์</>,
                <>There are also <b>time limits</b>. Real games such as chess have trees far too large to search to the end, so we must <b>approximate</b> instead of solving them exactly.</>,
              )}
            </p>
          </div>
          <ol className="timeline">
            <li><b>1846</b>{t('Babbage: ให้คอมพิวเตอร์พิจารณาแนวการเล่นที่เป็นไปได้', 'Babbage: a computer considers possible lines of play')}</li>
            <li><b>1912, 1944</b>{t('Zermelo, Von Neumann: อัลกอริทึมสำหรับการเล่นที่สมบูรณ์แบบ', 'Zermelo, Von Neumann: an algorithm for perfect play')}</li>
            <li><b>1945–1950</b>{t('Zuse, Wiener, Shannon: ค้นถึงระยะจำกัด แล้วประมาณค่า', 'Zuse, Wiener, Shannon: finite horizon, approximate evaluation')}</li>
            <li><b>1951</b>{t('Turing: โปรแกรมหมากรุกตัวแรก', 'Turing: the first chess program')}</li>
            <li><b>1952–57</b>{t('Samuel: ใช้ machine learning ปรับ evaluation function', 'Samuel: machine learning to improve evaluation accuracy')}</li>
            <li><b>1956</b>{t('McCarthy: ตัดกิ่ง (pruning) เพื่อค้นได้ลึกขึ้น', 'McCarthy: pruning to allow deeper search')}</li>
          </ol>
        </div>
      </section>

      {/* 2 ------------------------------------------------------------------ */}
      <section id="types" className="t-section">
        <H id="types" n={2} th="ประเภทของเกม" en="Types of games" />
        <p>
          {t(
            <>แบ่งเกมได้ด้วยสองคำถาม: <b>มีโชคเข้ามาเกี่ยวไหม</b> (deterministic หรือ chance) และ <b>เห็นข้อมูลครบไหม</b> (perfect หรือ imperfect information) แต่ละแบบต้องใช้วิธีคิดต่างกัน</>,
            <>Games can be classified by two questions: <b>is luck involved?</b> (deterministic or chance) and <b>is everything visible?</b> (perfect or imperfect information). Each kind needs a different approach.</>,
          )}
        </p>
        <GameTypesMatrix />
      </section>

      {/* 3 ------------------------------------------------------------------ */}
      <section id="formal" className="t-section">
        <H id="formal" n={3} th="นิยามเกมอย่างเป็นทางการ" en="Formal definition of a game" />
        <p>
          {t(
            <>ในบทนี้เกมสองผู้เล่นเรียกฝ่ายที่เดินก่อนว่า <b>MAX</b> และอีกฝ่ายว่า <b>MIN</b> เกมหนึ่งเกมนิยามได้ด้วยองค์ประกอบต่อไปนี้</>,
            <>In a two-player game, the player who moves first is called <b>MAX</b> and the other <b>MIN</b>. A game is defined by the following components.</>,
          )}
        </p>
        <div className="table-wrap">
          <table className="t-table">
            <thead><tr><th>{t('องค์ประกอบ', 'Component')}</th><th>{t('ความหมาย', 'Meaning')}</th><th>{t('ใน Tic-Tac-Toe', 'In Tic-Tac-Toe')}</th></tr></thead>
            <tbody>
              <tr><td className="mono">S₀</td><td>{t('สถานะเริ่มต้น', 'Initial state')}</td><td>{t('กระดานว่าง 9 ช่อง', 'An empty 3×3 board')}</td></tr>
              <tr><td className="mono">PLAYER(s)</td><td>{t('ใครเป็นคนเดินในสถานะ s', 'Whose turn it is in s')}</td><td>{t('X (MAX) ถ้าจำนวน X = O, ไม่เช่นนั้นเป็น O (MIN)', 'X (MAX) if #X = #O, otherwise O (MIN)')}</td></tr>
              <tr><td className="mono">ACTIONS(s)</td><td>{t('ตาที่เดินได้ทั้งหมด', 'Legal moves')}</td><td>{t('ช่องที่ยังว่าง', 'The empty cells')}</td></tr>
              <tr><td className="mono">RESULT(s, a)</td><td>{t('สถานะหลังเดินตา a', 'State after move a')}</td><td>{t('วางเครื่องหมายของผู้เล่นลงในช่อง a', "Place the player's mark in cell a")}</td></tr>
              <tr><td className="mono">TERMINAL-TEST(s)</td><td>{t('เกมจบหรือยัง', 'Is the game over?')}</td><td>{t('มีฝ่ายเรียงครบ 3 หรือกระดานเต็ม', 'Someone has three in a row, or the board is full')}</td></tr>
              <tr><td className="mono">UTILITY(s)</td><td>{t('คะแนนตอนจบ (มองจากฝั่ง MAX)', 'Final payoff (from MAX’s view)')}</td><td>{t('+1 X ชนะ, 0 เสมอ, −1 O ชนะ', '+1 X wins, 0 draw, −1 O wins')}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted">
          {t(<>เมื่อแตกทุก ACTIONS ต่อไปเรื่อย ๆ จาก S₀ จะได้ <b>game tree</b> ซึ่ง Tic-Tac-Toe มีทั้งหมด 549,946 node </>, <>Expanding every ACTIONS from S₀ gives the <b>game tree</b>; for Tic-Tac-Toe it has 549,946 nodes. </>)}
          <Link to="/tree">{t('ดู tree ทั้งต้นได้ที่นี่ →', 'See the whole tree →')}</Link>
        </p>
      </section>

      {/* 4 ------------------------------------------------------------------ */}
      <section id="minimax" className="t-section">
        <H id="minimax" n={4} th="Minimax" en="Minimax" />
        <div className="two-col">
          <div>
            <p>
              {t(
                <>Minimax ให้การเล่นที่ <b>สมบูรณ์แบบ</b> สำหรับเกม deterministic ที่เห็นข้อมูลครบ แนวคิดคือให้แต่ละสถานะมี <b>ค่า minimax</b> ซึ่งก็คือคะแนนที่ดีที่สุดที่ทำได้ เมื่อคู่แข่งเล่นดีที่สุดเช่นกัน</>,
                <>Minimax gives <b>perfect play</b> for deterministic, perfect-information games. Each state gets a <b>minimax value</b>: the best payoff achievable against an opponent who also plays perfectly.</>,
              )}
            </p>
            <ul className="t-list">
              <li>{t(<><b>leaf (สถานะจบเกม)</b>: ค่า = UTILITY</>, <><b>Leaf (terminal state)</b>: value = UTILITY</>)}</li>
              <li>{t(<><b>▲ MAX node</b>: ค่า = <b>มากที่สุด</b> ของลูก (MAX เลือกทางที่ดีที่สุดให้ตัวเอง)</>, <><b>▲ MAX node</b>: value = the <b>largest</b> child value (MAX picks what is best for itself)</>)}</li>
              <li>{t(<><b>▼ MIN node</b>: ค่า = <b>น้อยที่สุด</b> ของลูก (MIN เลือกทางที่แย่ที่สุดสำหรับ MAX)</>, <><b>▼ MIN node</b>: value = the <b>smallest</b> child value (MIN picks what is worst for MAX)</>)}</li>
            </ul>
            <p>
              {t(
                'อัลกอริทึมค้นแบบ depth-first ไปจนสุดทาง แล้วส่งค่ากลับขึ้นมาทีละชั้น ที่ root MAX จะเลือกตาที่ให้ค่าสูงสุด',
                'The algorithm searches depth-first to the leaves and backs values up one level at a time. At the root, MAX chooses the move with the highest value.',
              )}
            </p>
          </div>
          <pre className="code">{`function MINIMAX-DECISION(state)
  return argmax a ∈ ACTIONS(state)
         MIN-VALUE(RESULT(state, a))

function MAX-VALUE(state)
  if TERMINAL-TEST(state)
     return UTILITY(state)
  v ← −∞
  for each s in SUCCESSORS(state)
     v ← MAX(v, MIN-VALUE(s))
  return v

function MIN-VALUE(state)
  if TERMINAL-TEST(state)
     return UTILITY(state)
  v ← +∞
  for each s in SUCCESSORS(state)
     v ← MIN(v, MAX-VALUE(s))
  return v`}</pre>
        </div>
        <h3>{t('ลองไล่ทีละขั้น', 'Step through it')}</h3>
        <p className="muted">
          {t(
            'ต้นไม้ 2-ply (MAX เดิน 1 ครั้ง แล้ว MIN ตอบ 1 ครั้ง) กด "ถัดไป" เพื่อดูว่าค่าถูกส่งขึ้นมาอย่างไร',
            'A 2-ply tree (one move by MAX, one reply by MIN). Press "Next" to watch values being backed up.',
          )}
        </p>
        <SearchStepper mode="minimax" />
      </section>

      {/* 5 ------------------------------------------------------------------ */}
      <section id="minimax-props" className="t-section">
        <H id="minimax-props" n={5} th="คุณสมบัติของ Minimax" en="Properties of minimax" />
        <p>{t('ให้ b = branching factor (จำนวนตาที่เดินได้ต่อสถานะ) และ m = ความลึกสูงสุดของต้นไม้', 'Let b = branching factor (legal moves per state) and m = maximum depth of the tree.')}</p>
        <RevealCards
          items={[
            {
              q: t('Complete? (หาคำตอบเจอเสมอไหม)', 'Complete?'),
              a: t(
                <>ใช่ <b>ถ้าต้นไม้มีขนาดจำกัด</b> (หมากรุกมีกฎพิเศษที่ทำให้เกมไม่ยาวไม่สิ้นสุด) ข้อสังเกตคือกลยุทธ์ที่จำกัดอาจมีอยู่ได้ แม้ต้นไม้จะไม่จำกัด</>,
                <>Yes, <b>if the tree is finite</b> (chess has special rules for this). Note that a finite strategy can exist even in an infinite tree.</>,
              ),
            },
            {
              q: t('Optimal? (ได้คำตอบดีที่สุดไหม)', 'Optimal?'),
              a: t(
                <>ใช่ <b>เมื่อเจอคู่แข่งที่เล่นดีที่สุด</b> ถ้าคู่แข่งเล่นพลาด minimax ยังได้อย่างน้อยค่าที่การันตีไว้ แต่อาจไม่ได้ใช้ประโยชน์จากความผิดพลาดนั้นเต็มที่</>,
                <>Yes, <b>against an optimal opponent</b>. Against a fallible one, minimax still gets at least its guaranteed value but may not fully exploit the opponent's mistakes.</>,
              ),
            },
            { q: 'Time complexity?', a: t(<><b className="mono">O(b<sup>m</sup>)</b> เพราะต้องดูทุก node ในต้นไม้</>, <><b className="mono">O(b<sup>m</sup>)</b>, because every node in the tree is visited.</>) },
            { q: 'Space complexity?', a: t(<><b className="mono">O(bm)</b> เพราะค้นแบบ depth-first เก็บแค่เส้นทางปัจจุบันกับพี่น้องของแต่ละชั้น</>, <><b className="mono">O(bm)</b>: depth-first search stores only the current path plus the siblings at each level.</>) },
          ]}
        />
        <div className="callout">
          {t(
            <>หมากรุกมี b ≈ 35 และ m ≈ 100 ในเกมทั่วไป จึงมีราว 35<sup>100</sup> node <b>คำนวณจนจบไม่ได้แน่นอน</b> คำถามต่อไปคือ เราจำเป็นต้องดูทุกเส้นทางจริงไหม?</>,
            <>Chess has b ≈ 35 and m ≈ 100 for typical games, about 35<sup>100</sup> nodes, so <b>an exact solution is completely infeasible</b>. But do we really need to explore every path?</>,
          )}
        </div>
      </section>

      {/* 6 ------------------------------------------------------------------ */}
      <section id="alphabeta" className="t-section">
        <H id="alphabeta" n={6} th="α–β pruning" en="α–β pruning" />
        <div className="two-col">
          <div>
            <p>
              {t(
                <>α–β pruning ให้ค่าที่ root <b>เท่ากับ minimax ทุกประการ</b> แต่ข้าม (prune) กิ่งที่พิสูจน์ได้แล้วว่าจะไม่ถูกเลือกแน่นอน โดยระหว่างค้นจะพกค่าสองตัวลงไปด้วย</>,
                <>α–β pruning returns <b>exactly the same root value as minimax</b> but skips (prunes) branches that provably will never be chosen. It carries two values down the search:</>,
              )}
            </p>
            <ul className="t-list">
              <li>{t(<><b>α</b> = ค่าที่ดีที่สุด (สูงสุด) ที่ <b>MAX</b> การันตีได้แล้ว บนเส้นทางจาก root มาถึง node นี้</>, <><b>α</b> = the best (highest) value <b>MAX</b> can already guarantee along the path from the root to this node</>)}</li>
              <li>{t(<><b>β</b> = ค่าที่ดีที่สุด (ต่ำสุด) ที่ <b>MIN</b> การันตีได้แล้ว บนเส้นทางเดียวกัน</>, <><b>β</b> = the best (lowest) value <b>MIN</b> can already guarantee along the same path</>)}</li>
            </ul>
            <p>
              {t(
                <><b>ทำไมตัดได้:</b> สมมติ MAX มีทางเลือกที่ได้ α = 3 อยู่แล้ว ถ้าเจอ MIN node ที่ลูกตัวแรกให้ค่า 2 MIN node นั้นจะมีค่า ≤ 2 แน่นอน (MIN เลือกค่าต่ำ) ซึ่งแย่กว่า 3 MAX จึงไม่มีวันเลือกทางนี้ ลูกที่เหลือจะมีค่าเท่าไรก็ไม่มีผล ข้ามได้เลย</>,
                <><b>Why pruning is safe:</b> suppose MAX already has an option worth α = 3. If a MIN node's first child returns 2, that MIN node is worth ≤ 2 (MIN picks low values), which is worse than 3, so MAX will never go there. Whatever its remaining children are worth cannot matter, so we skip them.</>,
              )}
            </p>
          </div>
          <pre className="code">{t(`function MAX-VALUE(state, α, β)
  if TERMINAL-TEST(state)
     return UTILITY(state)
  v ← −∞
  for each s in SUCCESSORS(state)
     v ← MAX(v, MIN-VALUE(s, α, β))
     if v ≥ β then return v   // ✂ prune
     α ← MAX(α, v)
  return v

function MIN-VALUE(state, α, β)
  // เหมือน MAX-VALUE แต่สลับบทบาท
  ...
     v ← MIN(v, MAX-VALUE(s, α, β))
     if v ≤ α then return v   // ✂ prune
     β ← MIN(β, v)`, `function MAX-VALUE(state, α, β)
  if TERMINAL-TEST(state)
     return UTILITY(state)
  v ← −∞
  for each s in SUCCESSORS(state)
     v ← MAX(v, MIN-VALUE(s, α, β))
     if v ≥ β then return v   // ✂ prune
     α ← MAX(α, v)
  return v

function MIN-VALUE(state, α, β)
  // same as MAX-VALUE, roles reversed
  ...
     v ← MIN(v, MAX-VALUE(s, α, β))
     if v ≤ α then return v   // ✂ prune
     β ← MIN(β, v)`)}</pre>
        </div>
        <h3>{t('ลองไล่ทีละขั้น', 'Step through it')}</h3>
        <p className="muted">
          {t(
            'ใช้ต้นไม้เดียวกับ minimax ด้านบน สังเกตค่า α, β ใต้แต่ละ node และกิ่งที่ถูกขีด ✕ ลองเปลี่ยน "ลำดับลูก" แล้วดูจำนวน leaf ที่ต้องประเมิน',
            'The same tree as the minimax example. Watch the α, β values under each node and the branches crossed out with ✕. Change the "Move order" and compare how many leaves are evaluated.',
          )}
        </p>
        <SearchStepper mode="alphabeta" />
      </section>

      {/* 7 ------------------------------------------------------------------ */}
      <section id="ab-props" className="t-section">
        <H id="ab-props" n={7} th="คุณสมบัติของ α–β" en="Properties of α–β" />
        <ul className="t-list">
          <li>{t(<>การตัดกิ่ง <b>ไม่เปลี่ยนผลลัพธ์สุดท้าย</b></>, <>Pruning <b>does not affect the final result</b></>)}</li>
          <li>{t(<><b>ลำดับการเดินที่ดี</b> ช่วยให้ตัดได้มากขึ้น (ลองเลือก "ดีที่สุดก่อน" ในตัวอย่างด้านบน)</>, <><b>Good move ordering</b> makes pruning more effective (try "Best first" above)</>)}</li>
          <li>{t(<>ถ้าเรียงลำดับได้สมบูรณ์แบบ time complexity = <b className="mono">O(b<sup>m/2</sup>)</b> เท่ากับ <b>ค้นได้ลึกขึ้นสองเท่า</b> ในเวลาเท่าเดิม</>, <>With perfect ordering, time complexity = <b className="mono">O(b<sup>m/2</sup>)</b>, which <b>doubles the solvable depth</b></>)}</li>
          <li>{t(<>เป็นตัวอย่างของ <b>metareasoning</b> คือการคิดว่าการคำนวณส่วนไหนคุ้มค่าที่จะทำ</>, <>A simple example of <b>metareasoning</b>: reasoning about which computations are relevant</>)}</li>
          <li>{t(<>แต่สำหรับหมากรุก 35<sup>50</sup> ก็ยังมากเกินจะคำนวณได้อยู่ดี</>, <>Unfortunately, 35<sup>50</sup> is still impossible for chess</>)}</li>
        </ul>
      </section>

      {/* 8 ------------------------------------------------------------------ */}
      <section id="limits" className="t-section">
        <H id="limits" n={8} th="เมื่อเวลาไม่พอ: Cutoff และ Evaluation function" en="Resource limits: cutoffs and evaluation functions" />
        <p>{t('วิธีมาตรฐานเมื่อค้นจนจบเกมไม่ได้คือเปลี่ยนสองอย่างใน minimax / α–β:', 'The standard approach when we cannot search to the end is to change two things in minimax / α–β:')}</p>
        <ul className="t-list">
          <li>{t(
            <>ใช้ <b className="mono">CUTOFF-TEST</b> แทน TERMINAL-TEST เช่น หยุดเมื่อถึงความลึกที่กำหนด (อาจเพิ่ม <b>quiescence search</b> เพื่อค้นต่อในตำแหน่งที่ยังไม่นิ่ง เช่นกำลังแลกหมากกันอยู่)</>,
            <>Use <b className="mono">CUTOFF-TEST</b> instead of TERMINAL-TEST, e.g. a depth limit (perhaps plus <b>quiescence search</b>, which keeps searching positions that are not yet quiet, such as an ongoing exchange)</>,
          )}</li>
          <li>{t(
            <>ใช้ <b className="mono">EVAL</b> แทน UTILITY คือ <b>evaluation function</b> ที่ประเมินว่าตำแหน่งนี้ดีแค่ไหน</>,
            <>Use <b className="mono">EVAL</b> instead of UTILITY: an <b>evaluation function</b> that estimates how desirable a position is</>,
          )}</li>
        </ul>
        <h3>{t('ค้นได้ลึกแค่ไหน?', 'How deep can we search?')}</h3>
        <DepthCalculator />

        <h3>Evaluation function</h3>
        <p>
          {t(
            <>สำหรับหมากรุก มักใช้ <b>ผลรวมถ่วงน้ำหนักเชิงเส้น</b> ของ feature ต่าง ๆ: <span className="mono">Eval(s) = w₁f₁(s) + w₂f₂(s) + … + wₙfₙ(s)</span> เช่น w₁ = 9 และ f₁(s) = (จำนวนควีนขาว) − (จำนวนควีนดำ)</>,
            <>For chess this is typically a <b>linear weighted sum</b> of features: <span className="mono">Eval(s) = w₁f₁(s) + w₂f₂(s) + … + wₙfₙ(s)</span>, e.g. w₁ = 9 with f₁(s) = (number of white queens) − (number of black queens).</>,
          )}
        </p>
        <p>
          {t(
            'ด้านล่างใช้หลักเดียวกันกับ Tic-Tac-Toe: นับแถวที่ยัง "เปิด" อยู่ของแต่ละฝ่ายเป็น feature ลองปรับความลึกของ cutoff แล้วดูว่า ค้นตื้น + Eval เลือกตาเดียวกับคำตอบที่ถูกต้องจริงหรือไม่',
            'Below, the same idea is applied to Tic-Tac-Toe, using each side’s still-open lines as features. Change the cutoff depth and see whether a shallow search plus Eval picks the truly correct move.',
          )}
        </p>
        <EvalCutoffDemo />
      </section>

      {/* 9 ------------------------------------------------------------------ */}
      <section id="chance" className="t-section">
        <H id="chance" n={9} th="เกมที่มีโอกาส: Expectiminimax" en="Games of chance: expectiminimax" />
        <div className="two-col">
          <div>
            <p>
              {t(
                <>ในเกมอย่างแบ็กแกมมอน โชคมาจากลูกเต๋าหรือการสับไพ่ game tree จึงต้องมี <b>● chance node</b> คั่นระหว่างตาของผู้เล่น และค่าของ chance node คือ <b>ค่าเฉลี่ยถ่วงด้วยความน่าจะเป็น</b> (expected value) ของลูก</>,
                <>In games like backgammon, chance comes from dice or shuffled cards, so the game tree contains <b>● chance nodes</b> between the players’ moves. A chance node’s value is the <b>probability-weighted average</b> (expected value) of its children.</>,
              )}
            </p>
            <p>
              {t(
                <><b>Expectiminimax</b> ให้การเล่นที่สมบูรณ์แบบ ทำงานเหมือน minimax ทุกอย่าง เพิ่มแค่การจัดการ chance node</>,
                <><b>Expectiminimax</b> gives perfect play. It is just like minimax, except that it must also handle chance nodes.</>,
              )}
            </p>
          </div>
          <pre className="code">{`if state is a MAX node then
   return max of EXPECTIMINIMAX(children)
if state is a MIN node then
   return min of EXPECTIMINIMAX(children)
if state is a CHANCE node then
   return Σ P(child) × EXPECTIMINIMAX(child)`}</pre>
        </div>
        <h3>{t('ตัวอย่าง: เกมโยนเหรียญ', 'Example: a coin-flipping game')}</h3>
        <ExpectiminimaxDemo />
        <h3>{t('ในทางปฏิบัติ', 'In practice')}</h3>
        <ul className="t-list">
          <li>{t('ลูกเต๋าทำให้ b เพิ่มขึ้นมาก: ทอยเต๋า 2 ลูกได้ผลต่างกัน 21 แบบ และแบ็กแกมมอนมีตาที่เดินได้ราว 20 ตาต่อครั้ง', 'Dice increase b: there are 21 distinct rolls of two dice, and backgammon has about 20 legal moves per roll')}</li>
          <li>{t(<>ค้นลึก 4 ชั้นก็ได้ 20 × (21 × 20)<sup>3</sup> ≈ 1.2 × 10<sup>9</sup> node แล้ว</>, <>Depth 4 already means 20 × (21 × 20)<sup>3</sup> ≈ 1.2 × 10<sup>9</sup> nodes</>)}</li>
          <li>{t('ยิ่งลึก โอกาสที่จะไปถึง node นั้นจริง ๆ ยิ่งน้อย การมองไกลจึงคุ้มค่าน้อยลง', 'As depth increases, the probability of reaching a given node shrinks, so lookahead is worth less')}</li>
          <li>{t('α–β pruning ได้ผลน้อยลงมาก เพราะค่าเฉลี่ยขึ้นกับลูกทุกตัว', 'α–β pruning is much less effective, because an average depends on every child')}</li>
          <li>{t('TD-Gammon ใช้การค้นลึกแค่ 2 ชั้น + evaluation function ที่ดีมาก (เรียนรู้เอง) ก็เล่นได้ระดับแชมป์โลก', 'TD-Gammon uses a depth-2 search plus a very good (learned) evaluation function and plays at about world-champion level')}</li>
        </ul>
      </section>

      {/* 10 ----------------------------------------------------------------- */}
      <section id="values" className="t-section">
        <H id="values" n={10} th="ค่าที่แน่นอนของ Eval สำคัญไหม?" en="Do the exact values of Eval matter?" />
        <p>
          {t(
            <>ในเกม deterministic สิ่งที่สำคัญคือ <b>ลำดับ</b> ของค่าเท่านั้น จะแปลงค่าด้วยฟังก์ชัน <b>monotonic</b> แบบไหน (เพิ่มเมื่ออินพุตเพิ่ม) การตัดสินใจก็เหมือนเดิม เราเรียกค่าแบบนี้ว่า <b>ordinal utility</b> แต่ในเกมที่มีโอกาส มีแค่การแปลงแบบ <b>positive linear</b> (ax + b, a &gt; 0) เท่านั้นที่ไม่เปลี่ยนการตัดสินใจ Eval จึงควร <b>เป็นสัดส่วนกับผลตอบแทนที่คาดหวัง</b></>,
            <>In deterministic games only the <b>order</b> of values matters: behaviour is preserved under any <b>monotonic</b> transformation of Eval, so payoffs act as an <b>ordinal utility</b>. In games of chance, behaviour is preserved only by <b>positive linear</b> transformations (ax + b, a &gt; 0), so Eval should be <b>proportional to the expected payoff</b>.</>,
          )}
        </p>
        <ValueTransformDemo />
      </section>

      {/* 11 ----------------------------------------------------------------- */}
      <section id="imperfect" className="t-section">
        <H id="imperfect" n={11} th="เกมที่ข้อมูลไม่ครบ" en="Games of imperfect information" />
        <p>
          {t(
            'ตัวอย่างคือเกมไพ่ที่เราไม่เห็นไพ่ของคู่แข่ง ปกติเราคำนวณความน่าจะเป็นของการแจกไพ่แต่ละแบบได้ จึงดูเหมือน "ทอยลูกเต๋าครั้งใหญ่ครั้งเดียวตอนเริ่มเกม"',
            'Card games are the typical example: the opponent’s cards are unknown. We can usually compute a probability for each possible deal, so it looks like one big dice roll at the start of the game.',
          )}
        </p>
        <p>
          {t(
            <><b>แนวคิดที่ดูสมเหตุสมผล</b> คือคำนวณค่า minimax ของแต่ละ action ในการแจกไพ่ทุกแบบ แล้วเลือก action ที่ค่าเฉลี่ยสูงสุด โปรแกรมบริดจ์ GIB ใช้วิธีประมาณแบบนี้: สุ่มการแจกไพ่ 100 แบบที่สอดคล้องกับข้อมูลการประมูล แล้วเลือกตาที่ชนะ trick ได้มากที่สุดโดยเฉลี่ย</>,
            <><b>A tempting idea</b> is to compute the minimax value of each action in each deal and pick the action with the highest average. The bridge program GIB approximates this: it generates 100 deals consistent with the bidding and picks the play that wins the most tricks on average.</>,
          )}
        </p>
        <div className="callout warn">
          {t(<>แต่แนวคิดนี้ <b>ผิดในหลักการ!</b> ลองดูตัวอย่างทางแยกด้านล่าง</>, <>But this idea is <b>wrong in principle!</b> Try the fork-in-the-road example below.</>)}
        </div>
        <ImperfectInfoDemo />
        <h3>{t('การวิเคราะห์ที่ถูกต้อง', 'Proper analysis')}</h3>
        <p>
          {t(
            <>เมื่อสังเกตได้ไม่ครบ ค่าของ action ขึ้นกับ <b>information state / belief state</b> ที่ agent อยู่ ไม่ใช่สถานะจริงของโลก เราสามารถสร้างและค้นต้นไม้ของ information state ได้ ซึ่งนำไปสู่พฤติกรรมที่มีเหตุผลอย่าง:</>,
            <>With partial observability, the value of an action depends on the <b>information state / belief state</b> the agent is in, not the true state of the world. We can generate and search a tree of information states, which leads to rational behaviours such as:</>,
          )}
        </p>
        <ul className="t-list">
          <li>{t(<><b>ทำบางอย่างเพื่อหาข้อมูลเพิ่ม</b> เช่น ลองลงไพ่เพื่อดูว่าใครถือไพ่อะไร</>, <><b>Acting to obtain information</b>, e.g. leading a card to find out who holds what</>)}</li>
          <li>{t(<><b>ส่งสัญญาณให้คู่หู</b> เช่น การประมูลในบริดจ์</>, <><b>Signalling to one’s partner</b>, e.g. bidding in bridge</>)}</li>
          <li>{t(<><b>เล่นแบบสุ่ม</b> เพื่อไม่ให้คู่แข่งอ่านข้อมูลของเราออก เช่น การบลัฟในโป๊กเกอร์</>, <><b>Acting randomly</b> to minimise information disclosure, e.g. bluffing in poker</>)}</li>
        </ul>
      </section>

      {/* 12 ----------------------------------------------------------------- */}
      <section id="summary" className="t-section">
        <H id="summary" n={12} th="สรุป" en="Summary" />
        <div className="summary-grid">
          <div className="card"><b>{t('ความสมบูรณ์แบบทำไม่ได้จริง', 'Perfection is unattainable')}</b><p className="muted">{t('เกมจริงใหญ่เกินจะค้นจนจบ จึงต้องประมาณค่า (cutoff + Eval)', 'Real games are too big to search to the end, so we must approximate (cutoff + Eval).')}</p></div>
          <div className="card"><b>{t('คิดว่าควรคิดเรื่องอะไร', 'Think about what to think about')}</b><p className="muted">{t('α–β ข้ามการคำนวณที่ไม่มีผลกับคำตอบ ซึ่งเป็นตัวอย่างของ metareasoning', 'α–β skips computations that cannot affect the answer, an example of metareasoning.')}</p></div>
          <div className="card"><b>{t('ความไม่แน่นอนจำกัดการให้ค่า', 'Uncertainty constrains values')}</b><p className="muted">{t('เมื่อมีโอกาสเข้ามา ค่าของ Eval ต้องเป็นสัดส่วนกับผลตอบแทนจริง ไม่ใช่แค่ลำดับ', 'With chance involved, Eval must be proportional to the real payoff, not just correctly ordered.')}</p></div>
          <div className="card"><b>{t('ตัดสินใจจากข้อมูลที่มี', 'Decide on what you know')}</b><p className="muted">{t('การตัดสินใจที่ดีที่สุดขึ้นกับ information state ไม่ใช่สถานะจริง', 'Optimal decisions depend on the information state, not the real state.')}</p></div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          {t(
            '"เกมสำหรับ AI ก็เหมือนรถแข่ง Grand Prix สำหรับการออกแบบรถยนต์" คือเป็นสนามทดสอบไอเดียที่นำไปใช้กับปัญหาจริงได้',
            'Games are to AI as Grand Prix racing is to car design: a proving ground for ideas that carry over to real problems.',
          )}
        </p>
        <div className="hero-actions">
          <Link to="/advisor" className="btn primary">{t('ลองใช้ minimax กับกระดานจริง →', 'Try minimax on a real board →')}</Link>
          <Link to="/tree" className="btn">{t('สำรวจ game tree ทั้งต้น', 'Explore the full game tree')}</Link>
        </div>
      </section>
    </main>
  );
}
