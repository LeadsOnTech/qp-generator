import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getStoredToken, clearStoredToken, saveStoredToken } from '../lib/api';

const AuthContext = createContext(null);

export const getToken = getStoredToken;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionAccess, setSubscriptionAccess] = useState(null);

  const loadSubscriptions = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setSubscriptionAccess(null);
      return;
    }
    try {
      const data = await api.getSubscriptionStatus();
      if (data?.ok) {
        setSubscriptionAccess(data);
      }
    } catch (err) {
      // Non-fatal if offline or unassociated account
      setSubscriptionAccess(null);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setSubscriptionAccess(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.getCurrentUser();
      setUser(me);
      if (me?.role === 'INSTITUTE' || me?.instituteId) {
        loadSubscriptions();
      }
    } catch (err) {
      // Token invalid/expired — clear it so the login screen shows cleanly
      clearStoredToken();
      setUser(null);
      setSubscriptionAccess(null);
    } finally {
      setLoading(false);
    }
  }, [loadSubscriptions]);

  useEffect(() => { loadCurrentUser(); }, [loadCurrentUser]);

  const hasModuleAccess = useCallback((moduleKey) => {
    if (user?.role === 'ADMIN') return true;
    if (!subscriptionAccess?.access) return false;
    return Boolean(subscriptionAccess.access[moduleKey] || subscriptionAccess.hasBundle);
  }, [user, subscriptionAccess]);

  async function login(email, password) {
    const res = await api.login(email, password);
    if (res.requiresTwoFactor) {
      // Don't set user/token yet — the caller must show a code-entry
      // screen and call verifyTwoFactor() to actually complete login.
      return { requiresTwoFactor: true, pendingToken: res.pendingToken };
    }
    saveStoredToken(res.token);
    setUser(res.user);
    if (res.user?.role === 'INSTITUTE' || res.user?.instituteId) {
      loadSubscriptions();
    }
    return { requiresTwoFactor: false, user: res.user };
  }

  async function verifyTwoFactor(pendingToken, code) {
    const res = await api.verifyTwoFactorLogin(pendingToken, code);
    saveStoredToken(res.token);
    setUser(res.user);
    if (res.user?.role === 'INSTITUTE' || res.user?.instituteId) {
      loadSubscriptions();
    }
    return res.user;
  }

  async function signupWithOtp(payload) {
    const res = await api.verifyOtp(payload);
    saveStoredToken(res.token);
    setUser(res.user);
    if (res.user?.role === 'INSTITUTE' || res.user?.instituteId) {
      loadSubscriptions();
    }
    return res;
  }

  async function signup(instituteName, email, password) {
    const res = await api.signup(instituteName, email, password);
    saveStoredToken(res.token);
    setUser(res.user);
    if (res.user?.role === 'INSTITUTE' || res.user?.instituteId) {
      loadSubscriptions();
    }
    return res.user;
  }

  function logout() {
    clearStoredToken();
    setUser(null);
    setSubscriptionAccess(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        subscriptionAccess,
        hasModuleAccess,
        refreshSubscriptions: loadSubscriptions,
        login,
        verifyTwoFactor,
        signup,
        signupWithOtp,
        logout,
        refreshUser: loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
