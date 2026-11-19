import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import * as authApi from '../api/auth';
import { setSessionExpiredHandler } from '../api/http';

const AuthContext = createContext(null);

const initialState = { status: 'loading', user: null };

function reducer(state, action) {
  switch (action.type) {
    case 'authenticated':
      return { status: 'authenticated', user: action.user };
    case 'anonymous':
      return { status: 'anonymous', user: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    setSessionExpiredHandler(() => dispatch({ type: 'anonymous' }));
    authApi
      .restoreSession()
      .then((user) => dispatch({ type: 'authenticated', user }))
      .catch(() => dispatch({ type: 'anonymous' }));
  }, []);

  const login = useCallback(async (email, password) => {
    const user = await authApi.login(email, password);
    dispatch({ type: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      dispatch({ type: 'anonymous' });
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register: authApi.register, logout }),
    [state, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth нужно вызывать внутри <AuthProvider>');
  }
  return value;
}
