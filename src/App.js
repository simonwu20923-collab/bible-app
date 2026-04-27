import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import Reading from './pages/Reading';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import Admin from './pages/Admin';

function App() {
  const [lang, setLang] = React.useState(
    () => localStorage.getItem('bibleAppLang') || 'en'
  );

  function changeLang(l) {
    setLang(l);
    localStorage.setItem('bibleAppLang', l);
    // Trigger storage event so other components can react
    window.dispatchEvent(new Event('langChange'));
  }

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">📖 Bible Reading</div>
          <div className="nav-links">
            <NavLink to="/" end>
              {lang === 'zh' ? '首頁' : lang === 'es' ? 'Inicio' : 'Home'}
            </NavLink>
            <NavLink to="/reading">
              {lang === 'zh' ? '閱讀' : lang === 'es' ? 'Lectura' : 'Reading'}
            </NavLink>
            <NavLink to="/schedule">
              {lang === 'zh' ? '計劃' : lang === 'es' ? 'Horario' : 'Schedule'}
            </NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </div>
          {/* Language Toggle in Navbar */}
          <div className="lang-toggle">
            {[
              { code: 'en', label: '🇺🇸' },
              { code: 'es', label: '🇪🇸' },
              { code: 'zh', label: '中文' },
            ].map(({ code, label }) => (
              <button
                key={code}
                className={`lang-btn ${lang === code ? 'lang-btn-active' : ''}`}
                onClick={() => changeLang(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<div className="main-content"><Home lang={lang} /></div>} />
          <Route path="/reading" element={<Reading lang={lang} />} />
          <Route path="/schedule" element={<div className="main-content"><Schedule lang={lang} /></div>} />
          <Route path="/admin" element={<div className="main-content"><Admin /></div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;