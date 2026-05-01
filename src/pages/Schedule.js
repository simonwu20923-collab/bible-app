import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import schedule from '../data/schedule';
import { useUser } from '../context/UserContext';

const MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  zh: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
  sc: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
};
const WEEKDAYS = {
  en: ['S','M','T','W','T','F','S'],
  es: ['D','L','M','M','J','V','S'],
  zh: ['日','一','二','三','四','五','六'],
  sc: ['日','一','二','三','四','五','六'],
};

const ADMIN_PIN = '12061';

export default function Schedule({ lang = 'en' }) {
  const { user } = useUser();
  const name = user?.name || '';

  const [view, setView] = React.useState('calendar');
  const [completedDates, setCompletedDates] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  const navigate = useNavigate();
  const todayRef = React.useRef(null);

  const [showBulk, setShowBulk] = React.useState(false);
  const [bulkPin, setBulkPin] = React.useState('');
  const [bulkUnlocked, setBulkUnlocked] = React.useState(false);
  const [bulkName, setBulkName] = React.useState('');
  const [bulkFrom, setBulkFrom] = React.useState('');
  const [bulkTo, setBulkTo] = React.useState(todayStr);
  const [bulkPortion, setBulkPortion] = React.useState('both');
  const [bulkStatus, setBulkStatus] = React.useState('');
  const [bulkRunning, setBulkRunning] = React.useState(false);

  // Keep bulkName in sync when user logs in
  React.useEffect(() => { if (name) setBulkName(name); }, [name]);

  const isZh = lang === 'zh' || lang === 'sc';
  const ui = {
    en: { title: `Reading Schedule ${currentYear}`, both:'Both', nt:'NT', ot:'OT', listView:'☰ List View', calView:'⊞ Calendar View', loading:'Loading...',
          bulk:'Bulk Complete', pinLabel:'Admin PIN', pinPlaceholder:'Enter PIN...', unlock:'Unlock', nameLabel:'Name', fromLabel:'From', toLabel:'To',
          portionLabel:'Portion', portionBoth:'Both NT & OT', portionNT:'NT only', portionOT:'OT only',
          run:'Mark as Complete', cancel:'Cancel', running:'Working...', success:'Done!', pinError:'Incorrect PIN' },
    es: { title: `Horario de Lectura ${currentYear}`, both:'Ambos', nt:'NT', ot:'AT', listView:'☰ Lista', calView:'⊞ Calendario', loading:'Cargando...',
          bulk:'Completar en bloque', pinLabel:'PIN Admin', pinPlaceholder:'Ingresa PIN...', unlock:'Desbloquear', nameLabel:'Nombre', fromLabel:'Desde', toLabel:'Hasta',
          portionLabel:'Porción', portionBoth:'NT y AT', portionNT:'Solo NT', portionOT:'Solo AT',
          run:'Marcar como Completo', cancel:'Cancelar', running:'Procesando...', success:'¡Listo!', pinError:'PIN incorrecto' },
    zh: { title: `${currentYear}年閱讀計劃`, both:'兩篇', nt:'新約', ot:'舊約', listView:'☰ 列表', calView:'⊞ 日曆', loading:'載入中...',
          bulk:'批量完成', pinLabel:'管理員密碼', pinPlaceholder:'輸入密碼...', unlock:'解鎖', nameLabel:'姓名', fromLabel:'開始日期', toLabel:'結束日期',
          portionLabel:'部分', portionBoth:'新約和舊約', portionNT:'只有新約', portionOT:'只有舊約',
          run:'標記為完成', cancel:'取消', running:'處理中...', success:'完成！', pinError:'密碼錯誤' },
    sc: { title: `${currentYear}年阅读计划`, both:'两篇', nt:'新约', ot:'旧约', listView:'☰ 列表', calView:'⊞ 日历', loading:'加载中...',
          bulk:'批量完成', pinLabel:'管理员密码', pinPlaceholder:'输入密码...', unlock:'解锁', nameLabel:'姓名', fromLabel:'开始日期', toLabel:'结束日期',
          portionLabel:'部分', portionBoth:'新约和旧约', portionNT:'只有新约', portionOT:'只有旧约',
          run:'标记为完成', cancel:'取消', running:'处理中...', success:'完成！', pinError:'密码错误' },
  };
  const t = ui[lang] || ui.en;
  const months = MONTHS[lang] || MONTHS.en;
  const weekdays = WEEKDAYS[lang] || WEEKDAYS.en;

  // Reload dots whenever logged-in user changes
  React.useEffect(() => { loadCompletedDates(); }, [name]);

  React.useEffect(() => {
    if (!loading && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [loading, view]);

  async function loadCompletedDates() {
    setLoading(true);
    if (name) {
      const { data } = await supabase.from('checkins').select('date,portion').ilike('name', name);
      if (data) {
        const map = {};
        data.forEach(r => {
          if (!map[r.date]) map[r.date] = { nt: false, ot: false };
          if (r.portion === 'NT') map[r.date].nt = true;
          if (r.portion === 'OT') map[r.date].ot = true;
        });
        setCompletedDates(map);
      }
    } else {
      setCompletedDates({});
    }
    setLoading(false);
  }

  // Returns { nt: bool, ot: bool } for a date
  function getDotState(dateStr) {
    return completedDates[dateStr] || { nt: false, ot: false };
  }

  function goToDay(dateStr) {
    navigate(dateStr === todayStr ? '/reading' : `/reading?date=${dateStr}`);
  }

  function handlePinSubmit() {
    if (bulkPin === ADMIN_PIN) { setBulkUnlocked(true); setBulkStatus(''); }
    else setBulkStatus('pin-error');
  }

  async function runBulkComplete() {
    if (!bulkName.trim() || !bulkFrom || !bulkTo) return;
    setBulkRunning(true);
    setBulkStatus('');

    const from = new Date(bulkFrom + 'T12:00:00');
    const to   = new Date(bulkTo   + 'T12:00:00');
    const rows = [];

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${mm}-${dd}`;
      const schedKey = `${mm}-${dd}`;
      if (!schedule[schedKey]) continue;
      const portions = bulkPortion === 'both' ? ['NT', 'OT'] : bulkPortion === 'nt' ? ['NT'] : ['OT'];
      for (const portion of portions) rows.push({ name: bulkName.trim(), date: dateStr, portion });
    }

    if (rows.length === 0) { setBulkStatus('none'); setBulkRunning(false); return; }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from('checkins')
        .upsert(rows.slice(i, i + 100), { onConflict: 'name,date,portion', ignoreDuplicates: true });
      if (!error) inserted += rows.slice(i, i + 100).length;
    }

    setBulkStatus(`success:${inserted}`);
    setBulkRunning(false);
    if (bulkName.trim().toLowerCase() === name.toLowerCase()) await loadCompletedDates();
  }

  function resetBulk() {
    setShowBulk(false);
    setBulkPin('');
    setBulkUnlocked(false);
    setBulkName(name);
    setBulkFrom('');
    setBulkTo(todayStr);
    setBulkPortion('both');
    setBulkStatus('');
  }

  // ── Calendar render ────────────────────────────────────────────────────────

  function renderCalendar() {
    return months.map((monthName, monthIndex) => {
      const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
      const firstDay = new Date(currentYear, monthIndex, 1).getDay();
      const cells = [];
      for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="cal-day empty" />);

      for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(monthIndex + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${currentYear}-${mm}-${dd}`;
        const hasReading = !!schedule[`${mm}-${dd}`];
        const isToday = dateStr === todayStr;
        const dot = getDotState(dateStr);
        const hasDot = dot.nt || dot.ot;
        const isPast = new Date(dateStr + 'T12:00:00') < today;

        cells.push(
          <div key={d} ref={isToday ? todayRef : null}
            className={[
              'cal-day',
              isToday ? 'cal-today' : '',
              !hasReading ? 'cal-rest' : '',
              isPast && hasReading && !hasDot ? 'cal-missed' : '',
              hasReading ? 'cal-clickable' : '',
            ].join(' ')}
            onClick={() => hasReading && goToDay(dateStr)}>
            <span className="cal-num">{d}</span>
            {/* Show two separate dots — teal for NT, orange for OT */}
            {hasReading && (dot.nt || dot.ot) && (
              <span className="cal-dots-row">
                <span className={`cal-dot ${dot.nt ? 'dot-nt' : 'dot-empty'}`} />
                <span className={`cal-dot ${dot.ot ? 'dot-ot' : 'dot-empty'}`} />
              </span>
            )}
          </div>
        );
      }

      return (
        <div className="cal-month" key={monthIndex}>
          <div className="cal-month-name">{monthName}</div>
          <div className="cal-grid">
            {weekdays.map((d, i) => <div key={i} className="cal-weekday">{d}</div>)}
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
        if (!schedule[`${mm}-${dd}`]) continue;
        const isToday = dateStr === todayStr;
        const dot = getDotState(dateStr);
        const label = new Date(dateStr + 'T12:00:00').toLocaleDateString(
          isZh ? 'zh-TW' : lang === 'es' ? 'es-ES' : 'en-US',
          { month: 'long', day: 'numeric' }
        );
        allDays.push(
          <div key={dateStr} ref={isToday ? todayRef : null}
            className={`list-row ${isToday ? 'list-today' : ''}`}
            onClick={() => goToDay(dateStr)}>
            <span className="list-date">{label}</span>
            <div className="list-dots">
              <span className={dot.nt ? 'check-nt' : ''} style={!dot.nt ? { color: '#374151' } : {}}>
                {dot.nt ? '✓' : '✗'}
              </span>
              <span className={dot.ot ? 'check-ot' : ''} style={!dot.ot ? { color: '#374151' } : {}}>
                {dot.ot ? '✓' : '✗'}
              </span>
            </div>
          </div>
        );
      }
    }
    return allDays;
  }

  if (loading) return <div className="page"><div className="loading">{t.loading}</div></div>;

  return (
    <div className="page">
      <div className="schedule-header">
        <h1>{t.title}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="cal-legend">
            <span><span className="cal-dot dot-nt" /> {t.nt}</span>
            <span><span className="cal-dot dot-ot" /> {t.ot}</span>
          </div>
          <button
            onClick={() => setShowBulk(b => !b)}
            style={{
              background: showBulk ? 'var(--border)' : 'var(--brand-btn)',
              border: 'none', borderRadius: 8, color: 'white',
              padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
            }}>
            📋 {t.bulk}
          </button>
          <button className="view-toggle" onClick={() => setView(v => v === 'calendar' ? 'list' : 'calendar')}>
            {view === 'calendar' ? t.listView : t.calView}
          </button>
        </div>
      </div>

      {/* Bulk complete panel */}
      {showBulk && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          {!bulkUnlocked ? (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--brand)', marginBottom: 12 }}>
                🔒 {t.bulk} — {t.pinLabel}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="password" placeholder={t.pinPlaceholder} value={bulkPin}
                  onChange={e => setBulkPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', width: 160 }} />
                <button onClick={handlePinSubmit}
                  style={{ background: 'var(--brand-btn)', border: 'none', borderRadius: 8, color: 'white', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
                  {t.unlock}
                </button>
                <button onClick={resetBulk}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '8px 12px', cursor: 'pointer' }}>
                  {t.cancel}
                </button>
              </div>
              {bulkStatus === 'pin-error' && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 8 }}>⚠️ {t.pinError}</div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--brand)', marginBottom: 16 }}>🔓 {t.bulk}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t.nameLabel}</label>
                  <input value={bulkName} onChange={e => setBulkName(e.target.value)}
                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t.fromLabel}</label>
                  <input type="date" value={bulkFrom} onChange={e => setBulkFrom(e.target.value)}
                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t.toLabel}</label>
                  <input type="date" value={bulkTo} onChange={e => setBulkTo(e.target.value)}
                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t.portionLabel}</label>
                  <select value={bulkPortion} onChange={e => setBulkPortion(e.target.value)}
                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="both">{t.portionBoth}</option>
                    <option value="nt">{t.portionNT}</option>
                    <option value="ot">{t.portionOT}</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={runBulkComplete}
                  disabled={bulkRunning || !bulkName.trim() || !bulkFrom || !bulkTo}
                  style={{ background: 'var(--brand-btn)', border: 'none', borderRadius: 8, color: 'white', padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', opacity: bulkRunning || !bulkName.trim() || !bulkFrom || !bulkTo ? 0.5 : 1 }}>
                  {bulkRunning ? t.running : t.run}
                </button>
                <button onClick={resetBulk}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '10px 16px', cursor: 'pointer' }}>
                  {t.cancel}
                </button>
                {bulkStatus.startsWith('success') && (
                  <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.9rem' }}>
                    ✅ {t.success} ({bulkStatus.split(':')[1]} records)
                  </span>
                )}
                {bulkStatus === 'none' && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No reading days in that range.</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'calendar'
        ? <div className="cal-year">{renderCalendar()}</div>
        : <div className="list-view">{renderList()}</div>
      }
    </div>
  );
}