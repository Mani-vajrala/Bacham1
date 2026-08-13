import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [professor, setProfessor] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('liveclass_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Invalid token');
        })
        .then((data) => {
          setProfessor(data.professor);
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('liveclass_token', data.token);
    setToken(data.token);
    setProfessor(data.professor);
    return data;
  };

  const register = async (name, email, password, department) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, department })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');

    localStorage.setItem('liveclass_token', data.token);
    setToken(data.token);
    setProfessor(data.professor);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('liveclass_token');
    setToken(null);
    setProfessor(null);
  };

  return (
    <AuthContext.Provider
      value={{
        professor,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!professor
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
