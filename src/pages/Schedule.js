import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import schedule from '../data/schedule';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export default function Schedule() {
  const [view, setView] = React.useState('calendar');
  const [completedDates, setCompletedDates] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const name = localStorage.getItem('bibleAppName') || '';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  const navigate = useNavigate();
  const todayRef = React.useRef(null);

  React.useEffect(() => { loadCompletedDates(); }, []);

  // Auto-scroll to today after render
  React.useEffect(() => {
    if (!loading && todayRef.current) {
      setTimeout(() => {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [loading, view]);

  async function loadCompletedDates() {
    if (name) {
      const { data } = await supabase.from('checkins')
        .select('date, portion').ilike('name', name);
      if (data) {
        const map = {};
        data.forEach(r => {
          if (!map[r.date]) map[r.date] = { nt: false, ot: false };
          if (r.portion === 'NT') map[r.date].nt = true;
          if (r.portion === 'OT') map[r.date].ot = true;
        });
        setCompletedDates(map);
      }
    }
    setLoading(false);
  }

  function getDotClass(dateStr) {
    const d = completedDates[dateStr];
    if (!d) return '';
    if (d.nt && d.ot) return 'dot-full';
    if (d.nt) return 'dot-nt';
    if (d.ot) return 'dot-ot';
    return '';
  }

  function goToDay(dateStr) {
    navigate(dateStr === todayStr ? '/reading' : `/reading?date=${dateStr}`);
  }

  function renderCalendar() {
    return MONTHS.map((_, monthIndex) => {
      const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
      const firstDay = new Date(currentYear, monthIndex, 1).getDay();
      const cells = [];

      for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`e${i}`} className="cal-day empty" />);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(monthIndex + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${currentYear}-${mm}-${dd}`;
        const schedKey = `${mm}-${dd}`;
        const hasReading = !!schedule[schedKey];
        const isToday = dateStr === todayStr;
        const dotClass = getDotClass(dateStr);
        const isPast = new Date(dateStr + 'T12:00:00') < today;

        cells.push(
          <div key={d} ref={isToday ? todayRef : null}
            className={`cal-day ${isToday ? 'cal-today' : ''} ${!hasReading ? 'cal-rest' : ''} ${isPast && hasReading && !dotClass ? 'cal-missed' : ''} ${hasReading ? 'cal-clickable' : ''}`}
            onClick={() => hasReading && goToDay(dateStr)}>
            <span className="cal-num">{d}</span>
            {dotClass && <span className={`cal-dot ${dotClass}`} />}
          </div>
        );
      }

      return (
        <div className="cal-month" key={monthIndex}>
          <div className="cal-month-name">{MONTHS[monthIndex]}</div>
          <div className="cal-grid">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="cal-weekday">{d}</div>
            ))}
            {cells}
          </div>
        </div>
      );
    });
  }

  function renderList() {
    const allDays = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${currentYear}-${mm}-${dd}`;
        const schedKey = `${mm}-${dd}`;
        if (!schedule[schedKey]) continue;
        const isToday = dateStr === todayStr;
        const dot = getDotClass(dateStr);
        const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'long', day: 'numeric'
        });

        allDays.push(
          <div key={dateStr} ref={isToday ? todayRef : null}
            className={`list-row ${isToday ? 'list-today' : ''}`}
            onClick={() => goToDay(dateStr)}>
            <span className="list-date">{label}</span>
            <div className="list-dots">
              {dot === 'dot-full' && <><span className="check-nt">✓</span><span className="check-ot">✓</span></>}
              {dot === 'dot-nt' && <><span className="check-nt">✓</span><span style={{color:'#374151'}}>✗</span></>}
              {dot === 'dot-ot' && <><span style={{color:'#374151'}}>✗</span><span className="check-ot">✓</span></>}
            </div>
          </div>
        );
      }
    }
    return allDays;
  }

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;

  return (
    <div className="page">
      <div className="schedule-header">
        <h1>Reading Schedule {currentYear}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="cal-legend">
            <span><span className="cal-dot dot-full" /> Both</span>
            <span><span className="cal-dot dot-nt" /> NT</span>
            <span><span className="cal-dot dot-ot" /> OT</span>
          </div>
          <button className="view-toggle" onClick={() => setView(v => v === 'calendar' ? 'list' : 'calendar')}>
            {view === 'calendar' ? '☰ List View' : '⊞ Calendar View'}
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="cal-year">{renderCalendar()}</div>
      ) : (
        <div className="list-view">{renderList()}</div>
      )}
    </div>
  );
}