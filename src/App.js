import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import Reading from './pages/Reading';

function Home() {
  const [name, setName] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  function handleStart() {
    if (name.trim()) setSubmitted(true);
  }

  return (
    <div className="page">
      {!submitted ? (
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>Church in Cerritos</h1>
          <p className="welcome-sub">Bible Reading Tracker 2025</p>
          <div className="name-input-row">
            <input
              className="name-input"
              placeholder="Enter your name..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
            <button className="start-btn" onClick={handleStart}>Start →</button>
          </div>
        </div>
      ) : (
        <div className="welcome-card">
          <div className="welcome-emoji">👋</div>
          <h1>Welcome, {name}!</h1>
          <p className="welcome-sub">Ready to read today?</p>
          <a href="/reading" className="start-btn" style={{textDecoration:'none', display:'inline-block', marginTop:'8px'}}>
            Go to Today's Reading →
          </a>
        </div>
      )}
    </div>
  );
}

function Schedule() {
  return <div className="page"><h1>Schedule</h1></div>;
}

function Admin() {
  return <div className="page"><h1>Admin</h1></div>;
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">📖 Bible Reading</div>
          <div className="nav-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/reading">Reading</NavLink>
            <NavLink to="/schedule">Schedule</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/reading" element={<Reading />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;