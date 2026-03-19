import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/client';

const ACCESS_KEY = 'ustazor_access';
const REFRESH_KEY = 'ustazor_refresh';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => ({
    access: localStorage.getItem(ACCESS_KEY) || '',
    refresh: localStorage.getItem(REFRESH_KEY) || '',
  }));
  const [user, setUser] = useState(null);

  const isAuthenticated = Boolean(tokens.access);

  const login = useCallback(async ({ email, password }) => {
    const data = await authApi.login({ email, password });

    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);

    setTokens({ access: data.access, refresh: data.refresh });
    setUser(data.user || { email });

    return data;
  }, []);

  const register = useCallback(async ({ fullName, email, password, phoneNumber, userType }) => {
    return authApi.register({
      full_name: fullName,
      email,
      password,
      phone_number: phoneNumber,
      user_type: userType,
    });
  }, []);

  const verifyEmail = useCallback(async ({ email, code }) => {
    return authApi.verifyEmail({ email, code });
  }, []);

  const resendActivation = useCallback(async ({ email }) => {
    return authApi.resendActivation({ email });
  }, []);

  const fetchMe = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    const data = await authApi.me(tokens.access);
    setUser(data);
    return data;
  }, [tokens.access]);

  const updateMe = useCallback(async (payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    const data = await authApi.updateMe(payload, tokens.access);
    setUser(data);
    return data;
  }, [tokens.access]);

  const fetchWorkerProfile = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.workerProfile(tokens.access);
  }, [tokens.access]);

  const updateWorkerProfile = useCallback(async (payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.updateWorkerProfile(payload, tokens.access);
  }, [tokens.access]);

  const fetchWorkerSkills = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.workerSkills(tokens.access);
  }, [tokens.access]);

  const createWorkerSkill = useCallback(async (payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.createWorkerSkill(payload, tokens.access);
  }, [tokens.access]);

  const updateWorkerSkill = useCallback(async (id, payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.updateWorkerSkill(id, payload, tokens.access);
  }, [tokens.access]);

  const deleteWorkerSkill = useCallback(async (id) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.deleteWorkerSkill(id, tokens.access);
  }, [tokens.access]);

  const fetchWorkerDashboard = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.workerDashboard(tokens.access);
  }, [tokens.access]);

  const applyToVacancy = useCallback(async (vacancyId, payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.applyToVacancy(vacancyId, payload, tokens.access);
  }, [tokens.access]);

  const fetchMyProposals = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.listMyProposals(tokens.access);
  }, [tokens.access]);

  const closeOrder = useCallback(async (orderId) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.closeOrder(orderId, tokens.access);
  }, [tokens.access]);

  const createOrderReview = useCallback(async (orderId, payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.createOrderReview(orderId, payload, tokens.access);
  }, [tokens.access]);

  const fetchMyPortfolio = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.listMyPortfolio(tokens.access);
  }, [tokens.access]);

  const createPortfolio = useCallback(async (payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.createPortfolio(payload, tokens.access);
  }, [tokens.access]);

  const updatePortfolio = useCallback(async (id, payload) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.updatePortfolio(id, payload, tokens.access);
  }, [tokens.access]);

  const deletePortfolio = useCallback(async (id) => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    return authApi.deletePortfolio(id, tokens.access);
  }, [tokens.access]);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setTokens({ access: '', refresh: '' });
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    await authApi.deleteMe(tokens.access);
    logout();
  }, [tokens.access, logout]);

  useEffect(() => {
    if (!tokens.access) {
      return;
    }

    if (user) {
      return;
    }

    authApi
      .me(tokens.access)
      .then((data) => setUser(data))
      .catch(() => logout());
  }, [tokens.access, user, logout]);

  const value = useMemo(
    () => ({
      tokens,
      user,
      isAuthenticated,
      login,
      register,
      verifyEmail,
      resendActivation,
      fetchMe,
      updateMe,
      fetchWorkerProfile,
      updateWorkerProfile,
      fetchWorkerSkills,
      createWorkerSkill,
      updateWorkerSkill,
      deleteWorkerSkill,
      fetchWorkerDashboard,
      applyToVacancy,
      fetchMyProposals,
      closeOrder,
      createOrderReview,
      fetchMyPortfolio,
      createPortfolio,
      updatePortfolio,
      deletePortfolio,
      deleteAccount,
      logout,
    }),
    [
      tokens,
      user,
      isAuthenticated,
      login,
      register,
      verifyEmail,
      resendActivation,
      fetchMe,
      updateMe,
      fetchWorkerProfile,
      updateWorkerProfile,
      fetchWorkerSkills,
      createWorkerSkill,
      updateWorkerSkill,
      deleteWorkerSkill,
      fetchWorkerDashboard,
      applyToVacancy,
      fetchMyProposals,
      closeOrder,
      createOrderReview,
      fetchMyPortfolio,
      createPortfolio,
      updatePortfolio,
      deletePortfolio,
      deleteAccount,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
