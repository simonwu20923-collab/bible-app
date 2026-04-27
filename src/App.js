import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import Reading from './pages/reading';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import Admin from './pages/Admin';

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
      <Routes>
        <Route path="/" element={<div className="main-content"><Home /></div>} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/schedule" element={<div className="main-content"><Schedule /></div>} />
        <Route path="/admin" element={<div className="main-content"><Admin /></div>} />
      </Routes>
    </div>
  </BrowserRouter>
);
}

export default App;