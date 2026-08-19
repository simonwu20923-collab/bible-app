import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const UserContext = createContext(null);

// The signed-in reader. Identity is the account id; the name is a label that can
// change. Sessions saved before the id existed are topped up on load rather than
// being asked to sign in again.

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bible_app_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const persist = (userData) => {
    localStorage.setItem('bible_app_user', JSON.stringify(userData));
    setUser(userData);
  };

  // An older session carries name and email but no id. Look it up once and
  // keep it, so every write from here on can carry the account id.
  useEffect(() => {
    if (!user || user.id || !user.email) return;
    let cancelled = false;
    supabase.from('users').select('id, name')
      .eq('email', user.email).order('created_at', { ascending: true }).limit(1)
      .then(({ data }) => {
        const row = data && data[0];
        if (cancelled || !row) return;
        persist({ ...user, id: row.id });
      });
    return () => { cancelled = true; };
  }, [user]);

  const login = (userData) => {
    localStorage.removeItem('bibleAppName');   // clear old legacy key
    persist(userData);
  };

  const logout = () => {
    localStorage.removeItem('bible_app_user');
    localStorage.removeItem('bibleAppName');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
