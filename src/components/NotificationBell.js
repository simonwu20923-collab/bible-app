import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications, markRead, clearNotifications, pruneOldNotifications, NOTIF_TYPES,
} from '../notifications';
import { timeAgo } from './CommentsSection';

const UI = {
  en: { title: 'Notifications', none: 'No notifications yet', markAll: 'Mark all read',
        clear: 'Clear all', clearConfirm: 'Clear all notifications?',
        reply: 'replied in a thread you are in', mention: 'mentioned you',
        reaction: 'reacted to your comment' },
  es: { title: 'Notificaciones', none: 'Sin notificaciones', markAll: 'Marcar todo',
        clear: 'Borrar todo', clearConfirm: '¿Borrar todas las notificaciones?',
        reply: 'respondió en un hilo tuyo', mention: 'te mencionó',
        reaction: 'reaccionó a tu comentario' },
  zh: { title: '通知', none: '目前沒有通知', markAll: '全部標為已讀',
        clear: '清除全部', clearConfirm: '確定清除所有通知？',
        reply: '在你參與的討論中回覆了', mention: '提到了你',
        reaction: '對你的留言做出回應' },
  sc: { title: '通知', none: '目前没有通知', markAll: '全部标为已读',
        clear: '清除全部', clearConfirm: '确定清除所有通知？',
        reply: '在你参与的讨论中回复了', mention: '提到了你',
        reaction: '对你的留言做出回应' },
};

export default function NotificationBell({ name, lang = 'en' }) {
  const t = UI[lang] || UI.en;
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const load = React.useCallback(() => {
    if (name) fetchNotifications(name).then(setItems);
  }, [name]);

  React.useEffect(() => {
    load();
    if (!name) return;
    // Drop anything read and over a month old, so the table does not grow
    // without bound. Fire and forget: nothing on screen depends on it.
    pruneOldNotifications(name);
    // Cheap poll — this is a small congregation, not a chat app.
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [name, load]);

  React.useEffect(() => {
    if (!open) return;
    const away = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  if (!name) return null;
  const unread = items.filter(n => !n.read);

  function verb(n) {
    if (n.type === NOTIF_TYPES.MENTION) return t.mention;
    if (n.type === NOTIF_TYPES.REACTION) return `${t.reaction} ${n.emoji || ''}`;
    return t.reply;
  }

  async function openItem(n) {
    setOpen(false);
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      markRead([n.id]);
    }
    // The comment lives on a reading date; land there and let the page scroll.
    navigate(`/reading?date=${n.date}&comment=${n.comment_id}`);
  }

  async function markAll() {
    const ids = unread.map(n => n.id);
    setItems(prev => prev.map(x => ({ ...x, read: true })));
    markRead(ids);
  }

  async function clearAll() {
    // Unread items disappear too, so ask first rather than silently binning
    // something the reader has not seen.
    if (unread.length > 0 && !window.confirm(t.clearConfirm)) return;
    const previous = items;
    setItems([]);
    setOpen(false);
    try {
      await clearNotifications(name);
    } catch {
      setItems(previous);          // put them back if the delete failed
    }
  }

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(o => !o)}
              aria-label={t.title} title={t.title}>
        🔔
        {unread.length > 0 && (
          <span className="notif-badge">{unread.length > 9 ? '9+' : unread.length}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <span>{t.title}</span>
            <span className="notif-actions">
              {unread.length > 0 && (
                <button className="notif-markall" onClick={markAll}>{t.markAll}</button>
              )}
              {items.length > 0 && (
                <button className="notif-clear" onClick={clearAll}>{t.clear}</button>
              )}
            </span>
          </div>
          {items.length === 0 && <div className="notif-empty">{t.none}</div>}
          {items.map(n => (
            <button key={n.id} className={`notif-item${n.read ? '' : ' unread'}`}
                    onClick={() => openItem(n)}>
              <div className="notif-line">
                <strong>{n.actor}</strong> {verb(n)}
              </div>
              {n.excerpt && <div className="notif-excerpt">“{n.excerpt}”</div>}
              <div className="notif-time">{n.date} · {timeAgo(n.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
