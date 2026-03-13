import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';

function Home() {
  return (
    <div className="page">
      <h1>Welcome</h1>
      <p>Bible Reading Tracker for the Church in Cerritos</p>
    </div>
  );
}

function Reading() {
  return <div className="page"><h1>Today's Reading</h1></div>;
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