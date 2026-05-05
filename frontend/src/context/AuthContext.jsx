import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api/client';

const ACCESS_KEY = 'ustazor_access';
const REFRESH_KEY = 'ustazor_refresh';
const PHONE_REQUIRED_KEY = 'ustazor_phone_required';
const USER_TYPE_REQUIRED_KEY = 'ustazor_user_type_required';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isSignedIn, isLoaded: isClerkLoaded, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: isClerkUserLoaded } = useUser();
  const [tokens, setTokens] = useState(() => ({
    access: localStorage.getItem(ACCESS_KEY) || '',
    refresh: localStorage.getItem(REFRESH_KEY) || '',
  }));
  const [user, setUser] = useState(null);
  const [phoneCompletionRequired, setPhoneCompletionRequiredState] = useState(
    () => localStorage.getItem(PHONE_REQUIRED_KEY) === '1',
  );
  const [userTypeCompletionRequired, setUserTypeCompletionRequiredState] = useState(
    () => localStorage.getItem(USER_TYPE_REQUIRED_KEY) === '1',
  );
  const lastClerkSyncKeyRef = useRef('');

  const isAuthenticated = Boolean(tokens.access);

  const persistTokens = useCallback((accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    setTokens({ access: accessToken, refresh: refreshToken });
  }, []);

  const setPhoneCompletionRequired = useCallback((required) => {
    const shouldRequire = Boolean(required);
    setPhoneCompletionRequiredState(shouldRequire);
    if (shouldRequire) {
      localStorage.setItem(PHONE_REQUIRED_KEY, '1');
      return;
    }
    localStorage.removeItem(PHONE_REQUIRED_KEY);
  }, []);

  const setUserTypeCompletionRequired = useCallback((required) => {
    const shouldRequire = Boolean(required);
    setUserTypeCompletionRequiredState(shouldRequire);
    if (shouldRequire) {
      localStorage.setItem(USER_TYPE_REQUIRED_KEY, '1');
      return;
    }
    localStorage.removeItem(USER_TYPE_REQUIRED_KEY);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await authApi.login({ email, password });

    persistTokens(data.access, data.refresh);
    setUser(data.user || { email });
    setPhoneCompletionRequired(false);
    setUserTypeCompletionRequired(false);

    return data;
  }, [persistTokens, setPhoneCompletionRequired, setUserTypeCompletionRequired]);

  const register = useCallback(async ({
    fullName,
    email,
    password,
    phoneNumber,
    secondaryPhoneNumber,
    telegramUsername,
    instagramUsername,
    userType,
  }) => {
    return authApi.register({
      full_name: fullName,
      email,
      password,
      phone_number: phoneNumber,
      secondary_phone_number: secondaryPhoneNumber || '',
      telegram_username: telegramUsername || '',
      instagram_username: instagramUsername || '',
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
    setPhoneCompletionRequired(Boolean(!data?.phone_number));
    if (data?.user_type) {
      setUserTypeCompletionRequired(false);
    }
    return data;
  }, [setPhoneCompletionRequired, setUserTypeCompletionRequired, tokens.access]);

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

  const fetchWorkerReviews = useCallback(async (workerId) => {
    if (!workerId) {
      return [];
    }
    return authApi.listPublicWorkerReviews(workerId);
  }, []);

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

  const logout = useCallback(async () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setTokens({ access: '', refresh: '' });
    setUser(null);
    setPhoneCompletionRequired(false);
    setUserTypeCompletionRequired(false);
    lastClerkSyncKeyRef.current = '';

    if (isSignedIn) {
      try {
        await clerkSignOut();
      } catch {
        // Clerk logoutdagi xatoni frontendda to'xtatib turmaymiz.
      }
    }
  }, [clerkSignOut, isSignedIn, setPhoneCompletionRequired, setUserTypeCompletionRequired]);

  const deleteAccount = useCallback(async () => {
    if (!tokens.access) {
      throw new Error('Avval tizimga kiring.');
    }

    await authApi.deleteMe(tokens.access);
    logout();
  }, [tokens.access, logout]);

  const exchangeClerkSession = useCallback(async () => {
    if (!isClerkLoaded || !isClerkUserLoaded || !isSignedIn || !clerkUser) {
      return;
    }

    const email =
      clerkUser.primaryEmailAddress?.emailAddress
      || clerkUser.emailAddresses?.[0]?.emailAddress
      || '';
    if (!email) {
      return;
    }

    const syncKey = `${clerkUser.id}:${email.toLowerCase()}`;
    if (tokens.access && user?.email && user.email.toLowerCase() === email.toLowerCase()) {
      lastClerkSyncKeyRef.current = syncKey;
      return;
    }
    if (lastClerkSyncKeyRef.current === syncKey && tokens.access) {
      return;
    }

    const clerkToken = await getToken();
    if (!clerkToken) {
      throw new Error('Clerk session token olinmadi.');
    }

    const userTypeRaw = clerkUser.unsafeMetadata?.user_type;
    const userType = userTypeRaw === 'worker' || userTypeRaw === 'client' ? userTypeRaw : '';
    const exchangePayload = {
      clerk_user_id: clerkUser.id || '',
      email,
      full_name: clerkUser.fullName || '',
      phone_number: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
    };
    if (userType) {
      exchangePayload.user_type = userType;
    }

    const data = await authApi.exchangeClerk(
      exchangePayload,
      clerkToken,
    );
    persistTokens(data.access, data.refresh);
    setUser(data.user || { email });
    setPhoneCompletionRequired(Boolean(data.phone_required));
    setUserTypeCompletionRequired(Boolean(data.user_type_required));
    lastClerkSyncKeyRef.current = syncKey;
  }, [
    clerkUser,
    getToken,
    isClerkLoaded,
    isClerkUserLoaded,
    isSignedIn,
    persistTokens,
    setPhoneCompletionRequired,
    setUserTypeCompletionRequired,
    tokens.access,
    user?.email,
  ]);

  useEffect(() => {
    if (!isClerkLoaded || !isClerkUserLoaded) {
      return;
    }
    if (!isSignedIn) {
      return;
    }
    exchangeClerkSession().catch(() => {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      setTokens({ access: '', refresh: '' });
      setUser(null);
      setPhoneCompletionRequired(false);
      setUserTypeCompletionRequired(false);
      lastClerkSyncKeyRef.current = '';
    });
  }, [
    exchangeClerkSession,
    isClerkLoaded,
    isClerkUserLoaded,
    isSignedIn,
    setPhoneCompletionRequired,
    setUserTypeCompletionRequired,
  ]);

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
      phoneCompletionRequired,
      userTypeCompletionRequired,
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
      fetchWorkerReviews,
      fetchMyPortfolio,
      createPortfolio,
      updatePortfolio,
      deletePortfolio,
      deleteAccount,
      setPhoneCompletionRequired,
      setUserTypeCompletionRequired,
      logout,
    }),
    [
      tokens,
      user,
      phoneCompletionRequired,
      userTypeCompletionRequired,
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
      fetchWorkerReviews,
      fetchMyPortfolio,
      createPortfolio,
      updatePortfolio,
      deletePortfolio,
      deleteAccount,
      setPhoneCompletionRequired,
      setUserTypeCompletionRequired,
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
