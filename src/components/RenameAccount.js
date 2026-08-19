import React from 'react';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';

// Change the name shown on the leaderboard and in comments.
//
// Renaming is deliberate rather than a side effect of signing in with a
// shortened name — otherwise a merged account would quietly revert to the stub
// name someone typed once on a phone.
//
// The old name is kept as an alias, so signing in with it still works, and the
// reading history follows the account rather than the label.

const TEXT = {
  en: {
    heading: 'Display name', save: 'Save', saving: 'Saving…', saved: 'Saved',
    taken: 'Another account already uses that name.',
    empty: 'Please enter a name.',
    failed: 'Could not save that. Please try again.',
    note: 'Your reading history follows your account, so it stays with you. The old name keeps working at sign-in.',
  },
  es: {
    heading: 'Nombre visible', save: 'Guardar', saving: 'Guardando…', saved: 'Guardado',
    taken: 'Otra cuenta ya usa ese nombre.',
    empty: 'Por favor ingresa un nombre.',
    failed: 'No se pudo guardar. Inténtalo de nuevo.',
    note: 'Tu historial sigue a tu cuenta, así que se mantiene. El nombre anterior seguirá funcionando al entrar.',
  },
  zh: {
    heading: '顯示名稱', save: '儲存', saving: '儲存中…', saved: '已儲存',
    taken: '這個名稱已被其他帳號使用。',
    empty: '請輸入名稱。',
    failed: '無法儲存，請再試一次。',
    note: '閱讀記錄跟著帳號走，不會遺失。舊名稱仍可用來登入。',
  },
  sc: {
    heading: '显示名称', save: '保存', saving: '保存中…', saved: '已保存',
    taken: '这个名称已被其他帐号使用。',
    empty: '请输入名称。',
    failed: '无法保存，请再试一次。',
    note: '阅读记录跟着帐号走，不会丢失。旧名称仍可用来登录。',
  },
};

export default function RenameAccount({ lang = 'en' }) {
  const { user, login } = useUser();
  const t = TEXT[lang] || TEXT.en;
  const [value, setValue] = React.useState(user?.name || '');
  const [state, setState] = React.useState('idle');   // idle | saving | saved | error
  const [message, setMessage] = React.useState('');

  React.useEffect(() => { setValue(user?.name || ''); }, [user?.name]);

  async function save() {
    const next = value.trim();
    if (!next) { setState('error'); setMessage(t.empty); return; }
    if (!user?.id || next === user.name) return;

    setState('saving'); setMessage('');

    // Names stay unique across accounts, and an alias belonging to someone else
    // counts as taken too — otherwise their old name would stop reaching them.
    const [{ data: sameName }, { data: sameAlias }] = await Promise.all([
      supabase.from('users').select('id').ilike('name', next).neq('id', user.id).limit(1),
      supabase.from('user_aliases').select('user_id').ilike('name', next).neq('user_id', user.id).limit(1),
    ]);
    if (sameName?.length || sameAlias?.length) {
      setState('error'); setMessage(t.taken); return;
    }

    const previous = user.name;
    const { error } = await supabase.from('users').update({ name: next }).eq('id', user.id);
    if (error) { setState('error'); setMessage(t.failed); return; }

    // Keep the old name reachable at sign-in.
    if (previous && previous !== next) {
      await supabase.from('user_aliases')
        .upsert({ name: previous, user_id: user.id }, { onConflict: 'name' });
    }
    // Changing back to an earlier name would otherwise leave that name listed
    // both as the account's name and as its own alias.
    await supabase.from('user_aliases').delete().eq('user_id', user.id).ilike('name', next);

    login({ ...user, name: next });
    setState('saved'); setMessage(t.saved);
    setTimeout(() => setState('idle'), 2200);
  }

  if (!user?.id) return null;
  const dirty = value.trim() && value.trim() !== user.name;

  return (
    <div className="np-rename">
      <div className="np-heading">{t.heading}</div>
      <div className="np-rename-row">
        <input
          className="np-rename-input"
          value={value}
          onChange={e => { setValue(e.target.value); setState('idle'); setMessage(''); }}
          onKeyDown={e => { if (e.key === 'Enter' && dirty) save(); }}
          maxLength={40}
          aria-label={t.heading}
        />
        <button
          className="np-rename-save"
          onClick={save}
          disabled={!dirty || state === 'saving'}
        >
          {state === 'saving' ? t.saving : t.save}
        </button>
      </div>
      {message && (
        <div className={state === 'error' ? 'np-warn' : 'np-note'}>{message}</div>
      )}
      {dirty && state === 'idle' && <div className="np-note">{t.note}</div>}
    </div>
  );
}
