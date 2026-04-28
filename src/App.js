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
  }

  const navLabels = {
    en: { home: 'Home', reading: 'Reading', schedule: 'Schedule' },
    es: { home: 'Inicio', reading: 'Lectura', schedule: 'Horario' },
    zh: { home: '首頁', reading: '閱讀', schedule: '計劃' },
    sc: { home: '首页', reading: '阅读', schedule: '计划' },
  };
  const nav = navLabels[lang] || navLabels.en;

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">📖 Bible Reading</div>
          <div className="nav-links">
            <NavLink to="/" end>{nav.home}</NavLink>
            <NavLink to="/reading">{nav.reading}</NavLink>
            <NavLink to="/schedule">{nav.schedule}</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </div>
          <div className="lang-toggle">
            {[
              { code: 'en', label: '🇺🇸' },
              { code: 'es', label: '🇪🇸' },
              { code: 'zh', label: '繁' },
              { code: 'sc', label: '简' },
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