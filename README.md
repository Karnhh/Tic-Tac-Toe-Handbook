# Tic-Tac-Toe Handbook

เว็บคู่มือ Tic-Tac-Toe ที่ใช้ทฤษฎีเกม (Minimax / α–β pruning, AIMA บทที่ 6)

| หน้า | Path | ทำอะไร |
| --- | --- | --- |
| หน้าแรก | `/` | สรุปทฤษฎี และลิงก์ไปยังฟีเจอร์ |
| ตาต่อไป | `/advisor` | ใส่กระดานปัจจุบัน เลือกว่าเป็น X หรือ O แล้วดูว่าแต่ละช่องจะ ชนะ / เสมอ / แพ้ และควรลงช่องไหน |
| Game Tree | `/tree` | game tree ทั้งต้น 549,946 node ซูมและลากได้ คลิก node เพื่อไฮไลต์เส้นทางจาก root |

## Stack

- **Vite + React + TypeScript** เป็น static site ล้วน ไม่มี backend
- คำนวณทุกอย่างใน browser: minimax มี memo ตาม board key และ game tree ทั้งต้นสร้างเสร็จใน ~40ms
- วาด tree ด้วย `<canvas>` แบบ culling และ level-of-detail จึงลื่นแม้มีครึ่งล้าน node

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests ของ engine (node --test)
npm run build    # output ไปที่ dist/
```

## Deploy (Vercel)

import repo นี้เข้า Vercel ได้เลย ระบบจะตรวจเจอว่าเป็น Vite เอง (build: `npm run build`, output: `dist`)
ส่วน `vercel.json` มี rewrite ให้ path อย่าง `/tree` ทำงานได้ตอนรีเฟรชหน้า

ถ้าวันหนึ่งต้องมี API (เช่น เก็บสถิติ) ให้สร้างโฟลเดอร์ `api/` ใน repo เดียวกันนี้
Vercel จะ deploy ไฟล์ในนั้นเป็น serverless function ให้อัตโนมัติ ไม่ต้องแยก repo

## โครงสร้าง

```
src/
  lib/game.ts        ตรรกะเกม, ตรวจกระดาน, minimax, นับ node ของ α–β
  lib/tree.ts        สร้าง game tree ทั้งต้นลง typed arrays และคำนวณ layout
  lib/game.test.ts   tests
  pages/Home.tsx
  pages/Advisor.tsx
  pages/TreeExplorer.tsx
```
