# Tic-Tac-Toe Handbook

**English** · [ภาษาไทย](#ภาษาไทย)

An interactive handbook on **AI game playing (adversarial search)** told through Tic-Tac-Toe, following Chapter 6 of
*Artificial Intelligence: A Modern Approach* (minimax, α–β pruning, evaluation functions, expectiminimax, imperfect information).
The whole site is available in **Thai and English** (toggle in the top-right corner).

> "Game playing" here means adversarial search in AI. It is not economic Game Theory (Nash equilibria etc.).

| Page | Path | What it does |
| --- | --- | --- |
| Home | `/` | Overview and links to every feature |
| Theory | `/theory` | Game playing explained in detail: minimax, α–β, cutoff + Eval, expectiminimax, imperfect information, with step-by-step diagrams and adjustable demos |
| Next move | `/advisor` | Enter the current board, choose X or O, and see for every cell whether it wins / draws / loses and which move theory recommends |
| Game Tree | `/tree` | The complete 549,946-node game tree: zoom, pan, and click a node to highlight its path from the root |
| References | `/references` | Sources, and which parts come from the slides vs. this project |

### Stack

- **Vite + React + TypeScript**, a pure static site with no backend or database
- Everything is computed in the browser: memoised minimax by board key, and the full game tree builds in about 40 ms
- The tree is drawn on a `<canvas>` with culling and level-of-detail. Measured draw cost is about 0.5 ms median and under 6 ms worst case per frame,
  well inside the 8.3 ms budget of a 120 Hz display. Rendering is driven by `requestAnimationFrame`, so it follows the display refresh rate.
- Responsive layouts for desktop, iPad (portrait 3:4 and landscape 4:3), iPhone (portrait and landscape) and 1:√2 screens, with safe-area support

### Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine unit tests (node --test)
npm run build    # output in dist/
```

In dev mode, open `/tree` and run `__treeBench(0, 60)` in the console to measure per-frame draw time.

### Deploy (Vercel)

Import the repository into Vercel. It detects Vite automatically (build: `npm run build`, output: `dist`).
`vercel.json` rewrites every path to `index.html`, so routes like `/tree` survive a refresh.

If you ever need an API (for example to store statistics), add an `api/` folder to this same repository.
Vercel deploys it as serverless functions, so there is no need for a separate backend repo.

### Project structure

```
src/
  i18n.tsx           language context, t(th, en) helper, TH/EN toggle
  lib/game.ts        game rules, board validation, minimax, α–β node counting
  lib/tree.ts        builds the full game tree into typed arrays + layout
  lib/smalltree.ts   small trees for the theory page: minimax / α–β traces, expectiminimax
  lib/*.test.ts      tests
  components/        TreeDiagram (SVG) and the theory-page widgets
  pages/             Home, Theory, Advisor, TreeExplorer, References
```

### References

All theory comes from a single source. All explanations are paraphrased; no text or images were copied.

1. Russell, S. *Game playing* (Chapter 6) [Lecture slides]. Slides accompanying *Artificial Intelligence: A Modern Approach*. **(primary source)**
2. Russell, S., & Norvig, P. (2003). *Artificial Intelligence: A Modern Approach* (2nd ed.), Chapter 6. Prentice Hall. Listed for further reading. https://aima.cs.berkeley.edu/

The Tic-Tac-Toe figures, the Tic-Tac-Toe evaluation function and all interactive demos are original to this project.
The full list of what comes from the slides is on the `/references` page of the site.
This is an educational, non-commercial project and is not affiliated with the authors or publisher.

---

## ภาษาไทย

เว็บคู่มือแบบ interactive เรื่อง **Game Playing (adversarial search) ใน AI** โดยใช้ Tic-Tac-Toe เป็นตัวอย่าง
เนื้อหาเรียงตามบทที่ 6 ของ *Artificial Intelligence: A Modern Approach* (minimax, α–β pruning, evaluation function, expectiminimax, imperfect information)
ทั้งเว็บมี **ภาษาไทยและภาษาอังกฤษ** สลับได้ที่มุมขวาบน

> Game Playing ในที่นี้คือ adversarial search ใน AI ไม่ใช่ Game Theory (ทฤษฎีเกม) ทางเศรษฐศาสตร์

| หน้า | Path | ทำอะไร |
| --- | --- | --- |
| หน้าแรก | `/` | ภาพรวม และลิงก์ไปทุกฟีเจอร์ |
| ทฤษฎี | `/theory` | อธิบาย game playing แบบละเอียด: minimax, α–β, cutoff + Eval, expectiminimax, imperfect information พร้อมแผนภาพไล่ทีละขั้นและ demo ที่ปรับค่าได้ |
| ตาต่อไป | `/advisor` | ใส่กระดานปัจจุบัน เลือกว่าเป็น X หรือ O แล้วดูว่าแต่ละช่องจะ ชนะ / เสมอ / แพ้ และควรลงช่องไหน |
| Game Tree | `/tree` | game tree ทั้งต้น 549,946 node ซูมและลากได้ คลิก node เพื่อไฮไลต์เส้นทางจาก root |
| อ้างอิง | `/references` | แหล่งที่มา และแยกว่าส่วนไหนมาจากสไลด์ ส่วนไหนทำขึ้นเอง |

### Stack

- **Vite + React + TypeScript** เป็น static site ล้วน ไม่มี backend และ database
- คำนวณทุกอย่างใน browser: minimax มี memo ตาม board key และ game tree ทั้งต้นสร้างเสร็จในราว 40ms
- วาด tree ด้วย `<canvas>` แบบ culling และ level-of-detail วัดเวลาวาดได้ค่ากลางราว 0.5ms และกรณีแย่สุดไม่เกิน 6ms ต่อเฟรม
  ซึ่งอยู่ในงบ 8.3ms ของจอ 120Hz สบาย ๆ และขับด้วย `requestAnimationFrame` จึงวิ่งตาม refresh rate ของจอ
- รองรับจอคอม, iPad (แนวตั้ง 3:4 และแนวนอน 4:3), iPhone (แนวตั้งและแนวนอน) และจอ 1:√2 รวมถึง safe-area ของ iPhone

### วิธีรัน

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests ของ engine (node --test)
npm run build    # output ไปที่ dist/
```

ในโหมด dev เปิดหน้า `/tree` แล้วพิมพ์ `__treeBench(0, 60)` ใน console เพื่อวัดเวลาวาดต่อเฟรม

### Deploy (Vercel)

import repo นี้เข้า Vercel ได้เลย ระบบจะตรวจเจอว่าเป็น Vite เอง (build: `npm run build`, output: `dist`)
ส่วน `vercel.json` มี rewrite ให้ path อย่าง `/tree` ทำงานได้ตอนรีเฟรชหน้า

ถ้าวันหนึ่งต้องมี API (เช่น เก็บสถิติ) ให้สร้างโฟลเดอร์ `api/` ใน repo เดียวกันนี้
Vercel จะ deploy เป็น serverless function ให้อัตโนมัติ ไม่ต้องแยก repo

### โครงสร้าง

```
src/
  i18n.tsx           context ภาษา, ตัวช่วย t(th, en), ปุ่มสลับ TH/EN
  lib/game.ts        ตรรกะเกม, ตรวจกระดาน, minimax, นับ node ของ α–β
  lib/tree.ts        สร้าง game tree ทั้งต้นลง typed arrays และคำนวณ layout
  lib/smalltree.ts   ต้นไม้เล็กสำหรับหน้าทฤษฎี: trace ของ minimax / α–β, expectiminimax
  lib/*.test.ts      tests
  components/        TreeDiagram (SVG) และ widget ของหน้าทฤษฎี
  pages/             Home, Theory, Advisor, TreeExplorer, References
```

### อ้างอิง

เนื้อหาทฤษฎีทั้งหมดมาจากแหล่งเดียว คำอธิบายเรียบเรียงใหม่ ไม่ได้คัดลอกข้อความหรือรูปภาพ

1. Russell, S. *Game playing* (Chapter 6) [Lecture slides]. สไลด์ประกอบตำรา *Artificial Intelligence: A Modern Approach* **(แหล่งข้อมูลหลัก)**
2. Russell, S., & Norvig, P. (2003). *Artificial Intelligence: A Modern Approach* (2nd ed.), Chapter 6. Prentice Hall. ระบุไว้เพื่อค้นคว้าต่อ https://aima.cs.berkeley.edu/

ตัวเลขของ Tic-Tac-Toe, ฟังก์ชัน Eval ของ Tic-Tac-Toe และ demo แบบ interactive ทั้งหมดทำขึ้นเองในโปรเจกต์นี้
รายการละเอียดว่าส่วนไหนมาจากสไลด์ ดูได้ที่หน้า `/references` ของเว็บ
โปรเจกต์นี้ทำเพื่อการศึกษา ไม่ใช่เชิงพาณิชย์ และไม่มีส่วนเกี่ยวข้องกับผู้เขียนหรือสำนักพิมพ์
