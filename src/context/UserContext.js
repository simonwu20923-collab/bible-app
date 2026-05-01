import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bible_app_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
  localStorage.setItem('bible_app_user', JSON.stringify(userData));
  localStorage.removeItem('bibleAppName'); // clear old legacy key
  setUser(userData);
};

const logout = () => {
  localStorage.removeItem('bible_app_user');
  localStorage.removeItem('bibleAppName'); // clear old legacy key
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