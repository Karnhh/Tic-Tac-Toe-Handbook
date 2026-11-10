import { lazy, Suspense, useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Advisor from './pages/Advisor.tsx';
import Theory from './pages/Theory.tsx';
import References from './pages/References.tsx';
import { LangToggle, useLang } from './i18n.tsx';

// The tree page is heavier (canvas + 550k-node build), so load it on demand.
const TreeExplorer = lazy(() => import('./pages/TreeExplorer.tsx'));

export default function App() {
  const { t } = useLang();
  const { pathname, hash } = useLocation();
  const fullscreen = pathname === '/tree';

  // new page → start at the top (unless jumping to an anchor)
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);

  return (
    <div className={`app ${fullscreen ? 'app-fixed' : ''}`}>
      <nav className="nav">
        <Link to="/" className="brand" aria-label="Tic-Tac-Toe Handbook">
          <span className="brand-mark"><span className="x">X</span><span className="o">O</span></span>
          <span className="brand-text">Tic-Tac-Toe Handbook</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end className="link home-link">{t('หน้าแรก', 'Home')}</NavLink>
          <NavLink to="/theory" className="link">{t('ทฤษฎี', 'Theory')}</NavLink>
          <NavLink to="/advisor" className="link">{t('ตาต่อไป', 'Next move')}</NavLink>
          <NavLink to="/tree" className="link">Game Tree</NavLink>
        </div>
        <LangToggle />
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/theory" element={<Theory />} />
        <Route path="/advisor" element={<Advisor />} />
        <Route path="/references" element={<References />} />
        <Route
          path="/tree"
          element={
            <Suspense fallback={<div className="loading">{t('กำลังโหลด…', 'Loading…')}</div>}>
              <TreeExplorer />
            </Suspense>
          }
        />
        <Route path="*" element={<Home />} />
      </Routes>
      {!fullscreen && (
        <footer className="footer">
          <span>
            {t('เนื้อหาอ้างอิงจากสไลด์ Game playing (บทที่ 6) ประกอบตำรา AIMA ของ Russell & Norvig · ทำเพื่อการศึกษา ไม่ใช่เชิงพาณิชย์', 'Content based on the Game playing (Chapter 6) slides for Russell & Norvig’s AIMA · Educational, non-commercial')}
          </span>
          <Link to="/references">{t('ดูแหล่งอ้างอิง →', 'See references →')}</Link>
        </footer>
      )}
    </div>
  );
}
