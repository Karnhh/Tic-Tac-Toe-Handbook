import { Link } from 'react-router-dom';
import { useLang } from '../i18n.tsx';

export default function References() {
  const { t } = useLang();
  return (
    <main className="page refs-page">
      <span className="tag">{t('อ้างอิง', 'References')}</span>
      <h1>{t('แหล่งที่มาของเนื้อหา', 'Sources')}</h1>
      <p className="muted intro">
        {t(
          'เนื้อหาทฤษฎีในเว็บนี้มาจากแหล่งเดียว คือสไลด์ประกอบการสอนด้านล่าง เว็บนี้ทำขึ้นเพื่อการศึกษา ไม่ใช่เชิงพาณิชย์',
          'All theory on this site comes from a single source, the lecture slides listed below. This site was made for educational, non-commercial purposes.',
        )}
      </p>

      <section className="refs-block">
        <h2>{t('แหล่งข้อมูลหลัก', 'Primary source')}</h2>
        <ol className="refs-list">
          <li>
            <p className="cite">
              Russell, S. <i>Game playing</i> (Chapter 6) [Lecture slides]. {t('สไลด์ประกอบตำรา', 'Slides accompanying')}{' '}
              <i>Artificial Intelligence: A Modern Approach</i>.
            </p>
            <p className="muted small">
              {t(
                'ใช้เป็นแหล่งของลำดับหัวข้อ นิยาม อัลกอริทึม (pseudocode) ตัวอย่างต้นไม้และค่าตัวเลข ประวัติศาสตร์ และตัวอย่างโปรแกรมเกมในทางปฏิบัติ',
                'Used for the order of topics, definitions, algorithms (pseudocode), example trees and their values, the history timeline, and the examples of real game programs.',
              )}
            </p>
          </li>
        </ol>
        <h3>{t('ตำราที่สไลด์อ้างอิง', 'Textbook the slides are based on')}</h3>
        <ol className="refs-list" start={2}>
          <li>
            <p className="cite">
              Russell, S., &amp; Norvig, P. (2003). <i>Artificial Intelligence: A Modern Approach</i> (2nd ed.), Chapter 6. Prentice Hall.
            </p>
            <p className="muted small">
              {t(
                'ระบุไว้เพื่อให้ผู้อ่านค้นคว้าต่อได้ ไม่ได้ใช้ดึงเนื้อหาโดยตรง (ในฉบับพิมพ์ที่ 3 และ 4 หัวข้อเดียวกันอยู่ในบทที่ 5) เว็บไซต์ของตำรา: ',
                'Listed for further reading; content was not taken from it directly (in the 3rd and 4th editions the same topic is Chapter 5). Book website: ',
              )}
              <a href="https://aima.cs.berkeley.edu/" target="_blank" rel="noreferrer">aima.cs.berkeley.edu</a>
            </p>
          </li>
        </ol>
      </section>

      <section className="refs-block">
        <h2>{t('ส่วนที่นำมาจากสไลด์', 'Taken from the slides')}</h2>
        <ul className="t-list">
          <li>{t('ความแตกต่างระหว่างเกมกับปัญหาค้นหา และ timeline ประวัติศาสตร์ (Babbage ถึง McCarthy)', 'Games vs search problems, and the history timeline (Babbage to McCarthy)')}</li>
          <li>{t('ตารางประเภทของเกม (deterministic / chance × perfect / imperfect information) และตัวอย่างเกม', 'The types-of-games table (deterministic / chance × perfect / imperfect information) and its examples')}</li>
          <li>{t('Minimax: แนวคิด pseudocode คุณสมบัติ (complete, optimal, O(bᵐ), O(bm)) และต้นไม้ตัวอย่าง 2-ply ค่า 3, 12, 8 / 2, 4, 6 / 14, 5, 2', 'Minimax: idea, pseudocode, properties (complete, optimal, O(bᵐ), O(bm)) and the 2-ply example tree 3, 12, 8 / 2, 4, 6 / 14, 5, 2')}</li>
          <li>{t('α–β pruning: ตัวอย่างการตัดกิ่ง ความหมายของ α และ β pseudocode และคุณสมบัติ O(b^(m/2))', 'α–β pruning: the pruning example, the meaning of α and β, pseudocode and the O(b^(m/2)) property')}</li>
          <li>{t('Cutoff test, evaluation function แบบผลรวมถ่วงน้ำหนัก และตัวอย่าง 100 วินาที × 10⁴ node/วินาที', 'Cutoff tests, weighted-sum evaluation functions, and the 100 s × 10⁴ nodes/s example')}</li>
          <li>{t('ตัวอย่าง "ค่าที่แน่นอนไม่สำคัญ / สำคัญ" (1, 2, 2, 4 → 1, 20, 20, 400 และ 2.1 กับ 40.9)', 'The "exact values don’t matter / do matter" examples (1, 2, 2, 4 → 1, 20, 20, 400 and 2.1 vs 40.9)')}</li>
          <li>{t('Expectiminimax และเกมโยนเหรียญ (2, 4, 7, 4, 6, 0, 5, −2) รวมถึงตัวเลขของแบ็กแกมมอนและ TD-Gammon', 'Expectiminimax and the coin-flipping game (2, 4, 7, 4, 6, 0, 5, −2), plus the backgammon and TD-Gammon figures')}</li>
          <li>{t('Chinook, Deep Blue, Othello, Go และ GIB', 'Chinook, Deep Blue, Othello, Go and GIB')}</li>
          <li>{t('เกมที่ข้อมูลไม่ครบ: ตัวอย่างทางแยก (ทอง / เพชร / รถบัส) belief state และบทสรุป', 'Imperfect information: the fork-in-the-road example (gold / jewels / bus), belief states, and the summary')}</li>
        </ul>
      </section>

      <section className="refs-block">
        <h2>{t('ส่วนที่ทำขึ้นเองในเว็บนี้', 'Original to this site')}</h2>
        <ul className="t-list">
          <li>{t('คำอธิบายทั้งหมดเรียบเรียงใหม่ทั้งภาษาไทยและอังกฤษ ไม่ได้คัดลอกข้อความหรือรูปจากสไลด์', 'All explanations were rewritten in Thai and English; no text or images were copied from the slides')}</li>
          <li>{t('แผนภาพและ demo แบบ interactive ทุกชิ้น', 'Every diagram and interactive demo')}</li>
          <li>{t('ฟังก์ชัน Eval ของ Tic-Tac-Toe ในหัวข้อ Cutoff + Eval และตำแหน่งตัวอย่างบนกระดาน', 'The Tic-Tac-Toe evaluation function in the Cutoff + Eval section and its example positions')}</li>
          <li>{t('คะแนนแบบให้รางวัลการชนะเร็ว (±(10 + ช่องว่างที่เหลือ)) ในหน้าแนะนำตาต่อไป', 'The win-faster scoring (±(10 + empty cells left)) used by the next-move advisor')}</li>
          <li>
            {t(
              'ตัวเลขของ Tic-Tac-Toe (549,946 node, 255,168 เกม, 5,478 หน้ากระดาน) คำนวณด้วยโปรแกรมในเว็บนี้ และมี unit test ตรวจสอบ',
              'The Tic-Tac-Toe figures (549,946 nodes, 255,168 games, 5,478 positions) were computed by this site’s own code and are checked by unit tests',
            )}
          </li>
        </ul>
      </section>

      <section className="refs-block">
        <h2>{t('ฟอนต์และซอฟต์แวร์', 'Fonts and software')}</h2>
        <ul className="t-list">
          <li>IBM Plex Sans Thai, IBM Plex Mono · SIL Open Font License · {t('ผ่าน', 'via')} Google Fonts</li>
          <li>React, React Router, Vite, TypeScript · MIT / Apache-2.0 License</li>
        </ul>
      </section>

      <div className="callout note">
        {t(
          'เว็บนี้ไม่มีส่วนเกี่ยวข้องกับผู้เขียนตำราหรือสำนักพิมพ์ ลิขสิทธิ์ของสไลด์และตำราเป็นของผู้เขียนและสำนักพิมพ์ หากมีข้อผิดพลาดในการอธิบาย เป็นความผิดพลาดของเว็บนี้เอง',
          'This site is not affiliated with the textbook’s authors or publisher. Copyright in the slides and the textbook belongs to their authors and publisher. Any errors in the explanations are this site’s own.',
        )}
      </div>

      <div className="hero-actions">
        <Link to="/theory" className="btn">{t('← กลับไปหน้าทฤษฎี', '← Back to the theory')}</Link>
      </div>
    </main>
  );
}
