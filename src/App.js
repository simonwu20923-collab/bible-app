import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import NotificationBell from './components/NotificationBell';
import './App.css';
import Reading from './pages/Reading';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import Admin from './pages/Admin';
import Bible from './pages/Bible';
import SearchOverlay from './components/SearchOverlay';
import { UserProvider, useUser } from './context/UserContext';
import LoginModal from './components/LoginModal';
import Flag from './components/Flag';
import CheckinConfirm from './pages/CheckinConfirm';
import Unsubscribed from './pages/Unsubscribed';

function AppInner() {
  const { user, logout } = useUser();

  const [lang, setLang] = React.useState(
    () => localStorage.getItem('bibleAppLang') || 'en'
  );
  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem('bibleAppTheme') !== 'light'
  );

  React.useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light');
      localStorage.setItem('bibleAppTheme', 'dark');
    } else {
      document.body.classList.add('light');
      localStorage.setItem('bibleAppTheme', 'light');
    }
  }, [darkMode]);

  // Publish the navbar height as --navbar-h so sticky elements (Bible toolbar/
  // sidebar, search overlay) can park right below it on any screen size.
  React.useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    const set = () => document.documentElement.style.setProperty('--navbar-h', navbar.offsetHeight + 'px');
    set();
    const observer = new ResizeObserver(set);
    observer.observe(navbar);
    return () => observer.disconnect();
  }, []);

  function changeLang(l) {
    setLang(l);
    localStorage.setItem('bibleAppLang', l);
  }

  const navLabels = {
    en: { home: 'Home', reading: 'Reading', schedule: 'Schedule', bible: 'The Bible' },
    es: { home: 'Inicio', reading: 'Lectura', schedule: 'Horario', bible: 'La Biblia' },
    zh: { home: '首頁', reading: '閱讀', schedule: '計劃', bible: '聖經' },
    sc: { home: '首页', reading: '阅读', schedule: '计划', bible: '圣经' },
  };
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const nav = navLabels[lang] || navLabels.en;

  return (
    <div className="app">
      {/* Show login modal if not logged in */}
      {!user && <LoginModal />}

      <nav className="navbar">
        <a className="nav-brand" href="https://churchincerritos.org">📖 Bible Reading</a>
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <div className={`nav-collapse${menuOpen ? ' open' : ''}`}>
        <div className="nav-links" onClick={() => setMenuOpen(false)}>
          <NavLink to="/" end>{nav.home}</NavLink>
          <NavLink to="/reading">{nav.reading}</NavLink>
          <NavLink to="/schedule">{nav.schedule}</NavLink>
          <NavLink to="/bible">{nav.bible}</NavLink>
          {user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </div>
        <div className="nav-right">
          {/* Logged-in user display + logout */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: '13px',
                opacity: 0.75,
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                👤 {user.name}
              </span>
              <NotificationBell name={user.name} lang={lang} />
              <button
                onClick={logout}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #ccc)',
                  background: 'transparent',
                  color: 'var(--text, #333)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Log out
              </button>
            </div>
          )}

          {/* Search icon */}
          <button
            className={`nav-search-btn${searchOpen ? ' active' : ''}`}
            onClick={() => setSearchOpen(o => !o)}
            aria-label="Search the Bible"
            title="Search the Bible"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Language toggle */}
          <div className="lang-toggle">
            {['en', 'es', 'zh', 'sc'].map(code => (
              <button
                key={code}
                className={`lang-btn ${lang === code ? 'lang-btn-active' : ''}`}
                onClick={() => changeLang(code)}
              >
                <Flag code={code} />
              </button>
            ))}
          </div>
        </div>
        </div>
      </nav>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      <Routes>
        <Route path="/"        element={<div className="main-content"><Home lang={lang} /></div>} />
        <Route path="/reading" element={<Reading lang={lang} />} />
        <Route path="/schedule" element={<div className="main-content"><Schedule lang={lang} /></div>} />
        <Route path="/bible"   element={<Bible lang={lang} />} />
        <Route path="/admin"   element={<div className="main-content"><Admin /></div>} />
        {/* Landing page for the daily email's Finished NT/OT links. */}
        <Route path="/checkin" element={<div className="main-content"><CheckinConfirm /></div>} />
        <Route path="/unsubscribed" element={<div className="main-content"><Unsubscribed /></div>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppInner />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;