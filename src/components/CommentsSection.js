// src/components/CommentsSection.js
import React from 'react';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';

const EMOJIS = ['❤️', '🙏', '😊', '🔥', '💪', '😮'];

if (typeof document !== 'undefined' && !document.getElementById('comments-style')) {
  const s = document.createElement('style');
  s.id = 'comments-style';
  s.textContent = `
    .reaction-wrapper:hover .reaction-tooltip { opacity: 1 !important; }
    .thread-line-wrap { cursor: pointer; padding: 0 8px 0 0; display:flex; align-items:stretch; }
    .thread-line { width:2px; background:rgba(124,58,237,0.3); border-radius:1px; transition:background 0.15s; min-height:100%; }
    .thread-line-wrap:hover .thread-line { background:rgba(124,58,237,0.7); }
    .collapse-btn { background:none; border:1px solid var(--border); border-radius:3px; color:var(--text-muted);
      font-size:11px; font-weight:700; cursor:pointer; padding:0 4px; line-height:16px; height:16px;
      display:inline-flex; align-items:center; flex-shrink:0; transition:border-color 0.15s, color 0.15s; }
    .collapse-btn:hover { border-color:#7c3aed; color:#7c3aed; }
    .comment-node-text { color: var(--text) !important; }
  `;
  document.head.appendChild(s);
}

export function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Avatar({ name, size = 30 }) {
  const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.42, fontWeight: 700,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ReactionBar({ comment, currentName, onReact, lang }) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const reactions = comment.reactions || {};
  const myReactions = JSON.parse(localStorage.getItem(`reactions_${comment.id}`) || '[]');
  const reactLabel = lang === 'zh' ? '表情' : lang === 'sc' ? '表情' : lang === 'es' ? 'Reaccionar' : 'React';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
      {Object.entries(reactions).map(([emoji, names]) =>
        Array.isArray(names) && names.length > 0 ? (
          <div key={emoji} className="reaction-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => onReact(comment, emoji)} title={names.join(', ')}
              style={{
                background: myReactions.includes(emoji) ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
                border: myReactions.includes(emoji) ? '1px solid rgba(124,58,237,0.6)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '2px 8px', cursor: 'pointer',
                color: 'var(--text)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
              }}>
              {emoji} <span style={{ fontWeight: 600 }}>{names.length}</span>
            </button>
            <div className="reaction-tooltip" style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px',
              whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text)', zIndex: 200,
              pointerEvents: 'none', opacity: 0, transition: 'opacity 0.15s',
            }}>
              {names.join(', ')}
            </div>
          </div>
        ) : null
      )}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setPickerOpen(p => !p)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
          🙂 {reactLabel}
        </button>
        {pickerOpen && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', display: 'flex', gap: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { onReact(comment, e); setPickerOpen(false); }}
                style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                onMouseEnter={ev => ev.target.style.transform = 'scale(1.3)'}
                onMouseLeave={ev => ev.target.style.transform = 'scale(1)'}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CommentNode ───────────────────────────────────────────────────────────────
export function CommentNode({ comment, allComments, currentName, depth, onReact, onReply, lang }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [childrenCollapsed, setChildrenCollapsed] = React.useState(false);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const children = allComments
    .filter(c => c.parent_id === comment.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  function countAll(id) {
    const kids = allComments.filter(c => c.parent_id === id);
    return kids.reduce((n, k) => n + 1 + countAll(k.id), 0);
  }
  const totalHidden = 1 + countAll(comment.id);

  const replyLabel  = lang === 'zh' ? '回覆' : lang === 'sc' ? '回复' : lang === 'es' ? 'Responder' : 'Reply';
  const submitLabel = lang === 'zh' ? '送出' : lang === 'sc' ? '提交' : lang === 'es' ? 'Enviar' : 'Submit';
  const cancelLabel = lang === 'zh' ? '取消' : lang === 'sc' ? '取消' : lang === 'es' ? 'Cancelar' : 'Cancel';
  const hiddenLabel = lang === 'zh' ? '則留言已隱藏' : lang === 'sc' ? '则留言已隐藏' : lang === 'es' ? 'comentarios ocultos' : 'hidden';

  async function submitReply() {
    if (!replyText.trim() || !currentName || submitting) return;
    setSubmitting(true);
    await onReply(comment.id, replyText.trim());
    setReplyText(''); setReplyOpen(false); setSubmitting(false);
    setChildrenCollapsed(false);
    setCollapsed(false);
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 7, paddingTop: depth === 0 ? 10 : 6,
        borderTop: depth === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
      }}>
        <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} style={{ marginTop: 7 }}>
          {collapsed ? '+' : '−'}
        </button>
        <Avatar name={comment.name} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>{comment.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
            {collapsed && (
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                · {totalHidden} {hiddenLabel}
              </span>
            )}
          </div>
          {!collapsed && (
            <>
              <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.55, margin: '4px 0 0', wordBreak: 'break-word' }}>
                {comment.text}
              </p>
              <ReactionBar comment={comment} currentName={currentName} onReact={onReact} lang={lang} />
              <div style={{ display: 'flex', gap: 12, marginTop: 5, alignItems: 'center' }}>
                <button onClick={() => setReplyOpen(r => !r)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                  ↩ {replyLabel}
                </button>
                {children.length > 0 && (
                  <button onClick={() => setChildrenCollapsed(c => !c)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    {childrenCollapsed ? `▶ ${children.length} ${replyLabel}s` : '▼'}
                  </button>
                )}
              </div>
              {replyOpen && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <Avatar name={currentName || '?'} size={24} />
                  <div style={{ flex: 1 }}>
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                      placeholder={lang === 'zh' ? '輸入回覆...' : lang === 'sc' ? '输入回复...' : lang === 'es' ? 'Escribe una respuesta...' : 'Write a reply...'}
                      rows={2} autoFocus
                      style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '7px 10px', resize: 'none', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button onClick={submitReply} disabled={submitting || !replyText.trim()}
                        style={{ background: '#7c3aed', border: 'none', borderRadius: 6, color: 'white', fontSize: 12, fontWeight: 600, padding: '4px 12px', cursor: 'pointer', opacity: submitting || !replyText.trim() ? 0.5 : 1 }}>
                        {submitLabel}
                      </button>
                      <button onClick={() => { setReplyOpen(false); setReplyText(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                        {cancelLabel}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {!collapsed && !childrenCollapsed && children.length > 0 && (
        <div style={{ display: 'flex', marginLeft: 16 }}>
          <div className="thread-line-wrap" onClick={() => setChildrenCollapsed(true)} title="Collapse">
            <div className="thread-line" />
          </div>
          <div style={{ flex: 1 }}>
            {children.map(child => (
              <CommentNode key={child.id} comment={child} allComments={allComments}
                currentName={currentName} depth={depth + 1}
                onReact={onReact} onReply={onReply} lang={lang} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CommentsSection ──────────────────────────────────────────────────────
export default function CommentsSection({ queryDate, lang = 'en' }) {
  const { user } = useUser();
  const currentName = user?.name || '';

  const [comments, setComments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);

  const ui = {
    en: { title:'💬 Discussion', add:'+ Add Comment', submit:'Post', cancel:'Cancel', placeholder:'Share your thoughts...', noComments:'Be the first to comment!', loginPrompt:'Please log in to comment.' },
    es: { title:'💬 Discusión', add:'+ Comentar', submit:'Publicar', cancel:'Cancelar', placeholder:'Comparte tus pensamientos...', noComments:'¡Sé el primero en comentar!', loginPrompt:'Por favor inicia sesión para comentar.' },
    zh: { title:'💬 討論', add:'+ 新增留言', submit:'發送', cancel:'取消', placeholder:'分享你的想法...', noComments:'成為第一個留言的人！', loginPrompt:'請先登入以留言。' },
    sc: { title:'💬 讨论', add:'+ 添加评论', submit:'发送', cancel:'取消', placeholder:'分享你的想法...', noComments:'成为第一个评论的人！', loginPrompt:'请先登录以评论。' },
  };
  const t = ui[lang] || ui.en;

  React.useEffect(() => { fetchComments(); }, [queryDate]);

  async function fetchComments() {
    setLoading(true);
    const { data } = await supabase.from('comments').select('*')
      .eq('date', queryDate).order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
  }

  async function submitComment() {
    if (!text.trim() || !currentName) return;
    setSubmitting(true);
    await supabase.from('comments').insert({ date: queryDate, name: currentName.trim(), text: text.trim(), parent_id: null, reactions: {} });
    setText(''); setShowForm(false);
    await fetchComments();
    setSubmitting(false);
  }

  async function handleReply(parentId, replyText) {
    await supabase.from('comments').insert({ date: queryDate, name: currentName.trim(), text: replyText, parent_id: parentId, reactions: {} });
    await fetchComments();
  }

  async function handleReact(comment, emoji) {
    const reactions = { ...(comment.reactions || {}) };
    const names = reactions[emoji] ? [...reactions[emoji]] : [];
    const storageKey = `reactions_${comment.id}`;
    const myReactions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (myReactions.includes(emoji)) {
      reactions[emoji] = names.filter(n => n !== currentName);
      localStorage.setItem(storageKey, JSON.stringify(myReactions.filter(e => e !== emoji)));
    } else {
      if (!names.includes(currentName)) names.push(currentName || 'Anonymous');
      reactions[emoji] = names;
      localStorage.setItem(storageKey, JSON.stringify([...myReactions, emoji]));
    }
    await supabase.from('comments').update({ reactions }).eq('id', comment.id);
    setComments(prev => prev.map(c => c.id === comment.id ? { ...c, reactions } : c));
  }

  const activityMap = {};
  comments.forEach(c => {
    const rootId = c.parent_id || c.id;
    const ts = new Date(c.created_at).getTime();
    if (!activityMap[rootId] || ts > activityMap[rootId]) activityMap[rootId] = ts;
  });
  const topLevel = comments
    .filter(c => !c.parent_id)
    .sort((a, b) => (activityMap[b.id] || 0) - (activityMap[a.id] || 0));

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-sec)', fontWeight: 600, fontSize: 14 }}>
          {t.title} {comments.length > 0 && `(${comments.length})`}
        </span>
        {currentName && (
          <button onClick={() => setShowForm(f => !f)}
            style={{ background: showForm ? 'var(--border)' : '#7c3aed', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>
            {showForm ? t.cancel : t.add}
          </button>
        )}
      </div>

      {showForm && currentName && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
          <Avatar name={currentName} />
          <div style={{ flex: 1 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t.placeholder} rows={3} autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowForm(false); setText(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>{t.cancel}</button>
              <button onClick={submitComment} disabled={submitting || !text.trim()}
                style={{ background: '#7c3aed', border: 'none', borderRadius: 6, color: 'white', fontSize: 13, fontWeight: 600, padding: '5px 16px', cursor: 'pointer', opacity: submitting || !text.trim() ? 0.5 : 1 }}>
                {t.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {!currentName && <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>{t.loginPrompt}</p>}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Loading...</div>
      ) : topLevel.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>{t.noComments}</div>
      ) : (
        <div>
          {topLevel.map(comment => (
            <CommentNode key={comment.id} comment={comment} allComments={comments}
              currentName={currentName} depth={0}
              onReact={handleReact} onReply={handleReply} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── HomeThreadCard ────────────────────────────────────────────────────────────
export function HomeThreadCard({ threadComments, lang = 'en', onNavigate }) {
  const { user } = useUser();
  const currentName = user?.name || '';

  const [allComments, setAllComments] = React.useState(threadComments);

  const root = allComments.find(c => !c.parent_id);
  if (!root) return null;

  const viewLabel = lang === 'zh' ? '查看完整討論 →' : lang === 'sc' ? '查看完整讨论 →' : lang === 'es' ? 'Ver discusión completa →' : 'View full thread →';
  const replyLabel = lang === 'zh' ? '則留言' : lang === 'sc' ? '则留言' : lang === 'es' ? 'comentarios' : 'comments';

  const sorted = [...allComments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const top5ids = new Set([root.id, ...sorted.slice(0, 5).map(c => c.id)]);
  const shown = allComments.filter(c => top5ids.has(c.id));
  const hiddenCount = allComments.length - shown.length;

  async function handleReact(comment, emoji) {
    const reactions = { ...(comment.reactions || {}) };
    const names = reactions[emoji] ? [...reactions[emoji]] : [];
    const storageKey = `reactions_${comment.id}`;
    const myReactions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (myReactions.includes(emoji)) {
      reactions[emoji] = names.filter(n => n !== currentName);
      localStorage.setItem(storageKey, JSON.stringify(myReactions.filter(e => e !== emoji)));
    } else {
      if (!names.includes(currentName)) names.push(currentName || 'Anonymous');
      reactions[emoji] = names;
      localStorage.setItem(storageKey, JSON.stringify([...myReactions, emoji]));
    }
    await supabase.from('comments').update({ reactions }).eq('id', comment.id);
    setAllComments(prev => prev.map(c => c.id === comment.id ? { ...c, reactions } : c));
  }

  async function handleReply(parentId, replyText) {
    const result = await supabase.from('comments').insert({
      date: root.date, name: currentName.trim(), text: replyText,
      parent_id: parentId, reactions: {},
    }).select();
    if (result.data) setAllComments(prev => [...prev, result.data[0]]);
  }

  const activityMap = {};
  shown.forEach(c => {
    const rootId = c.parent_id || c.id;
    const ts = new Date(c.created_at).getTime();
    if (!activityMap[rootId] || ts > activityMap[rootId]) activityMap[rootId] = ts;
  });
  const topLevel = shown
    .filter(c => !c.parent_id)
    .sort((a, b) => (activityMap[b.id] || 0) - (activityMap[a.id] || 0));

  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '2px 12px 8px', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
      {topLevel.map(comment => (
        <CommentNode key={comment.id} comment={comment} allComments={shown}
          currentName={currentName} depth={0}
          onReact={handleReact} onReply={handleReply} lang={lang} />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, paddingLeft: 4 }}>
        {hiddenCount > 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{hiddenCount} more {replyLabel}</span>
        )}
        <button onClick={onNavigate}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
          {viewLabel}
        </button>
      </div>
    </div>
  );
}