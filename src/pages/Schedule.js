import React from 'react';
import { supabase } from '../supabase';
import schedule from '../data/schedule';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function Schedule() {
  const [completedDates, setCompletedDates] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const name = localStorage.getItem('bibleAppName') || '';
  const today = new Date();
  const currentYear = today.getFullYear();

  React.useEffect(() => {
    loadCompletedDates();
  }, []);

  async function loadCompletedDates() {
    if (!name) { setLoading(false); return; }
    const { data } = await supabase
      .from('checkins')
      .select('date, portion')
      .ilike('name', name);

    if (data) {
      const map = {};
      data.forEach(r => {
        if (!map[r.date]) map[r.date] = { nt: false, ot: false };
        if (r.portion === 'NT') map[r.date].nt = true;
        if (r.portion === 'OT') map[r.date].ot = true;
      });
      setCompletedDates(map);
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

  function renderMonth(monthIndex) {
    const daysInMonth = getDaysInMonth(currentYear, monthIndex);
    const firstDay = getFirstDayOfMonth(currentYear, monthIndex);
    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-day empty" />);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(monthIndex + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;
      const scheduleKey = `${mm}-${dd}`;
      const hasReading = !!schedule[scheduleKey];
      const isToday = dateStr === today.toISOString().split('T')[0];
      const dotClass = getDotClass(dateStr);
      const isPast = new Date(dateStr) < today;

      cells.push(
        <div
          key={d}
          className={`cal-day ${isToday ? 'cal-today' : ''} ${!hasReading ? 'cal-rest' : ''} ${isPast && hasReading && !dotClass ? 'cal-missed' : ''}`}
        >
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
  }

  if (loading) return <div className="page"><div className="loading">Loading schedule...</div></div>;

  return (
    <div className="page">
      <div className="schedule-header">
        <h1>Reading Schedule {currentYear}</h1>
        <div className="cal-legend">
          <span><span className="cal-dot dot-full" /> Both</span>
          <span><span className="cal-dot dot-nt" /> NT only</span>
          <span><span className="cal-dot dot-ot" /> OT only</span>
        </div>
      </div>
      {!name && (
        <div className="schedule-notice">
          Enter your name on the Home page to see your progress dots
        </div>
      )}
      <div className="cal-year">
        {MONTHS.map((_, i) => renderMonth(i))}
      </div>
    </div>
  );
}