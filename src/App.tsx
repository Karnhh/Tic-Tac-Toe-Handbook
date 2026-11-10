import { lazy, Suspense } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Advisor from './pages/Advisor.tsx';

// The tree page is heavier (canvas + 550k-node build), so load it on demand.
const TreeExplorer = lazy(() => import('./pages/TreeExplorer.tsx'));

export default function App() {
  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className="brand">
          <span className="brand-mark"><span className="x">X</span><span className="o">O</span></span>
          <span>Tic-Tac-Toe Handbook</span>
        </Link>
        <NavLink to="/" end className="link">หน้าแรก</NavLink>
        <NavLink to="/advisor" className="link">ตาต่อไป</NavLink>
        <NavLink to="/tree" className="link">Game Tree</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/advisor" element={<Advisor />} />
        <Route
          path="/tree"
          element={
            <Suspense fallback={<div className="loading">กำลังโหลด…</div>}>
              <TreeExplorer />
            </Suspense>
          }
        />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}
