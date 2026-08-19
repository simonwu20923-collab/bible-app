import { supabase } from './supabase';

// Notifications are keyed by user NAME, like comments and check-ins — this app
// has no auth and no user ids on comments, so a name is the only identity there
// is. That also means read-state is advisory, not enforced.

export const NOTIF_TYPES = { REPLY: 'reply', REACTION: 'reaction', MENTION: 'mention' };

const same = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
const excerpt = (text, n = 90) =>
  (text || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Names contain spaces ("MaryAnn Corrigan"), so @mentions cannot be parsed with
// a word-boundary regex — "@Simon Wu" would match only "Simon". Instead we test
// the known names against the text, longest first so "Simon Wu" wins over a
// hypothetical "Simon".
export function findMentions(text, names) {
  if (!text) return [];
  const hits = [];
  const sorted = [...names].sort((a, b) => b.length - a.length);
  let haystack = text;
  for (const name of sorted) {
    const i = haystack.toLowerCase().indexOf('@' + name.toLowerCase());
    if (i === -1) continue;
    hits.push(name);
    // Blank it out so a shorter name inside this one cannot also match.
    haystack = haystack.slice(0, i) + ' '.repeat(name.length + 1) + haystack.slice(i + name.length + 1);
  }
  return hits;
}

export async function loadUserNames() {
  const { data } = await supabase.from('users').select('name').order('name');
  return (data || []).map(u => u.name).filter(Boolean);
}

async function insert(rows) {
  const real = rows.filter(r => r.recipient && !same(r.recipient, r.actor));
  if (!real.length) return;
  const { error } = await supabase.from('notifications').insert(real);
  if (error) console.error('notification insert failed', error);
}

// Everyone who has posted anywhere in the chain is notified of a new reply.
export function threadParticipants(allComments, parentId) {
  if (!parentId) return [];
  const byId = new Map(allComments.map(c => [c.id, c]));
  let root = byId.get(parentId);
  while (root && root.parent_id) root = byId.get(root.parent_id);
  if (!root) return [];
  const ids = new Set([root.id]);
  let grew = true;
  while (grew) {
    grew = false;
    allComments.forEach(c => {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) { ids.add(c.id); grew = true; }
    });
  }
  return [...new Set(allComments.filter(c => ids.has(c.id)).map(c => c.name))];
}

export async function notifyReply({ allComments, parentId, comment, actor, date, mentionNames }) {
  const rows = [];
  const mentioned = findMentions(comment.text, mentionNames || []);
  threadParticipants(allComments, parentId)
    .filter(n => !mentioned.some(m => same(m, n)))   // a mention outranks a reply
    .forEach(recipient => rows.push({
      recipient, actor, type: NOTIF_TYPES.REPLY,
      comment_id: comment.id, date, excerpt: excerpt(comment.text),
    }));
  mentioned.forEach(recipient => rows.push({
    recipient, actor, type: NOTIF_TYPES.MENTION,
    comment_id: comment.id, date, excerpt: excerpt(comment.text),
  }));
  await insert(rows);
}

export async function notifyMentionsOnly({ comment, actor, date, mentionNames }) {
  await insert(findMentions(comment.text, mentionNames || []).map(recipient => ({
    recipient, actor, type: NOTIF_TYPES.MENTION,
    comment_id: comment.id, date, excerpt: excerpt(comment.text),
  })));
}

export async function notifyReaction({ comment, actor, emoji, date }) {
  await insert([{
    recipient: comment.name, actor, type: NOTIF_TYPES.REACTION,
    comment_id: comment.id, date, excerpt: excerpt(comment.text), emoji,
  }]);
}

export async function fetchNotifications(name, limit = 40) {
  if (!name) return [];
  const { data } = await supabase.from('notifications')
    .select('*').ilike('recipient', name)
    .order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function markRead(ids) {
  if (!ids.length) return;
  await supabase.from('notifications').update({ read: true }).in('id', ids);
}

// A notification has no value once it has been seen, so clearing deletes the
// rows rather than hiding them — otherwise the panel and the table both grow
// forever.
export async function clearNotifications(name) {
  if (!name) return;
  const { error } = await supabase.from('notifications').delete().ilike('recipient', name);
  if (error) console.error('clear notifications failed', error);
}

// Housekeeping on load. Anything read and older than a month is already past
// the 40 the panel shows, so it is only taking up space.
export async function pruneOldNotifications(name, days = 30) {
  if (!name) return;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  await supabase.from('notifications').delete()
    .ilike('recipient', name).eq('read', true).lt('created_at', cutoff);
}
