/**
 * Auth context — passcode-based access control.
 * Stores the passcode in sessionStorage so it survives page refreshes
 * but not new tabs/browser restarts.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'mockinterview-passcode';

interface AuthContextType {
  isAuthenticated: boolean;
  passcode: string | null;
  login: (code: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  passcode: null,
  login: async () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function getStoredPasscode(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [passcode, setPasscode] = useState<string | null>(
    () => sessionStorage.getItem(STORAGE_KEY),
  );

  const login = useCallback(async (code: string): Promise<boolean> => {
    // Verify with backend
    try {
      const res = await fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      });
      if (res.ok) {
        sessionStorage.setItem(STORAGE_KEY, code);
        setPasscode(code);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPasscode(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: passcode !== null,
        passcode,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
