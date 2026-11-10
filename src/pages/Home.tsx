import { Link } from 'react-router-dom';
import { symbol, type Cell } from '../lib/game.ts';

const DEMO: Cell[] = [1, 2, 1, 0, 1, 0, 2, 0, 0];

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>คู่มือ Tic-Tac-Toe ด้วยทฤษฎีเกม</h1>
          <p className="lead">
            Tic-Tac-Toe เป็นเกมสองผู้เล่นที่ <b>deterministic</b> และ <b>เห็นข้อมูลครบทั้งกระดาน</b> (perfect information)
            จึงใช้ <b>Minimax</b> หาตาที่ดีที่สุดได้แบบแม่นยำ เว็บนี้ให้คุณลองใช้ทฤษฎีนี้กับกระดานจริง
            และเดินสำรวจ game tree ทั้งต้นได้
          </p>
          <div className="hero-actions">
            <Link to="/advisor" className="btn primary">หาตาที่ดีที่สุด →</Link>
            <Link to="/tree" className="btn">สำรวจ Game Tree</Link>
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
          <p className="muted" style={{ textAlign: 'center', fontSize: 14, marginTop: 10 }}>
            ตา X: Minimax เลือกมุมขวาล่าง แล้วชนะทันที
          </p>
        </div>
      </section>

      <section className="features">
        <Link to="/advisor" className="card feature">
          <span className="tag">ฟีเจอร์ 1</span>
          <h2>ตาต่อไปควรลงช่องไหน</h2>
          <p className="muted">
            วางกระดานตามสถานการณ์ตอนนี้ แล้วเลือกว่าคุณเป็น X หรือ O ระบบจะคำนวณ minimax ให้ทุกช่องที่ยังว่าง
            บอกผลลัพธ์ว่า ชนะ / เสมอ / แพ้ และจะจบในกี่ตา พร้อมเทียบจำนวน node ที่ค้นระหว่าง minimax กับ α–β pruning
          </p>
          <span className="go">เปิดเครื่องมือ →</span>
        </Link>
        <Link to="/tree" className="card feature">
          <span className="tag">ฟีเจอร์ 2</span>
          <h2>Game Tree ทั้งต้น</h2>
          <p className="muted">
            ดูทุกลำดับการเดินที่เป็นไปได้ทั้ง 549,946 node ในต้นเดียว ซูมเข้าออกและลากดูได้
            คลิก node ไหนก็จะไฮไลต์เส้นทางจาก root ลงมาถึง node นั้น สีของ node บอกค่า minimax ของมัน
          </p>
          <span className="go">เปิด Tree →</span>
        </Link>
      </section>

      <section className="stats">
        <div className="card stat"><div className="num">549,946</div><div className="lbl">node ใน game tree ทั้งต้น</div></div>
        <div className="card stat"><div className="num">255,168</div><div className="lbl">รูปแบบเกมที่จบได้ (leaf)</div></div>
        <div className="card stat"><div className="num">5,478</div><div className="lbl">สถานะกระดานที่ไม่ซ้ำกัน</div></div>
        <div className="card stat"><div className="num">เสมอ</div><div className="lbl">ผลลัพธ์ถ้าทั้งสองฝ่ายเล่นดีที่สุด</div></div>
      </section>

      <section>
        <h2 style={{ marginBottom: 16 }}>ทฤษฎีที่ใช้</h2>
        <div className="theory">
          <div className="card">
            <h3>Minimax</h3>
            <p className="muted">
              MAX (X) อยากได้คะแนนสูงสุด ส่วน MIN (O) อยากได้คะแนนต่ำสุด ระบบไล่ค่าคะแนนขึ้นจาก leaf โดย node ของ MAX
              เลือกลูกที่มากที่สุด node ของ MIN เลือกลูกที่น้อยที่สุด ค่าที่ root จึงเป็นผลลัพธ์ที่ดีที่สุดที่การันตีได้
              เมื่อเจอคู่แข่งที่เล่นเก่งที่สุด
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
              ให้ผลเหมือน minimax ทุกอย่าง แต่ตัดกิ่งที่พิสูจน์ได้แล้วว่าไม่มีผลกับคำตอบทิ้งไป α คือค่าที่ดีที่สุดของ MAX ที่เจอแล้ว
              β คือค่าที่ดีที่สุดของ MIN ที่เจอแล้ว ถ้าเรียงลำดับตาได้ดีที่สุด เวลาจะลดจาก O(b<sup>m</sup>) เหลือ O(b<sup>m/2</sup>)
            </p>
            <pre>{`for each child c of s:
  v ← max(v, MIN-VALUE(c, α, β))
  if v ≥ β: return v      // prune
  α ← max(α, v)`}</pre>
          </div>
          <div className="card">
            <h3>คะแนนที่เว็บนี้ใช้</h3>
            <p className="muted">
              X ชนะ = +(10 + จำนวนช่องว่างที่เหลือ), O ชนะ = −(10 + ช่องว่างที่เหลือ), เสมอ = 0
              การบวกจำนวนช่องว่างทำให้ AI เลือก <b>ชนะให้เร็วที่สุด</b> และถ้าแพ้แน่ ๆ ก็จะ <b>ยื้อให้นานที่สุด</b>
            </p>
          </div>
          <div className="card">
            <h3>ทำไม Tic-Tac-Toe ถึงคำนวณได้หมด</h3>
            <p className="muted">
              branching factor สูงสุดคือ 9 และลึกไม่เกิน 9 ตา tree ทั้งต้นจึงมีแค่ราว 5.5 แสน node คอมพิวเตอร์คำนวณเสร็จในไม่กี่สิบมิลลิวินาที
              ต่างจากหมากรุก (b ≈ 35, m ≈ 100) ที่ต้องตัดความลึกแล้วใช้ evaluation function ประมาณค่าแทน
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
