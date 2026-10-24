import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'qf_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.getCurrentUser();
      setUser(me);
    } catch (err) {
      // Token invalid/expired — clear it so the login screen shows cleanly
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCurrentUser(); }, [loadCurrentUser]);

  async function login(email, password) {
    const res = await api.login(email, password);
    if (res.requiresTwoFactor) {
      // Don't set user/token yet — the caller must show a code-entry
      // screen and call verifyTwoFactor() to actually complete login.
      return { requiresTwoFactor: true, pendingToken: res.pendingToken };
    }
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    return { requiresTwoFactor: false, user: res.user };
  }

  async function verifyTwoFactor(pendingToken, code) {
    const res = await api.verifyTwoFactorLogin(pendingToken, code);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    return res.user;
  }

  
  async function signupWithOtp(payload) {
    const res = await api.verifyOtp(payload);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    return res;
  }

  async function signup(instituteName, email, password) {
    const res = await api.signup(instituteName, email, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyTwoFactor, signup, signupWithOtp, logout, refreshUser: loadCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
