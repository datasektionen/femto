import React, { createContext, useState, useEffect } from 'react';

interface AuthContextType {
  hasToken: boolean;
  setHasToken: (value: boolean) => void;
}

export const AuthContext = createContext<AuthContextType>({
  hasToken: false,
  setHasToken: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasToken, setHasToken] = useState<boolean>(() => {
    // Initialize hasToken from localStorage during first render
    const token = localStorage.getItem('token');
    return !!token;
  });

  // Update hasToken whenever localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      setHasToken(!!token);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ hasToken, setHasToken }}>
      {children}
    </AuthContext.Provider>
  );
};