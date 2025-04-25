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
  const [hasToken, setHasToken] = useState<boolean>(true);
  // ÄNDRA SEN GLENN  
  //  const token = localStorage.getItem('token');
  //  console.log("🏁 [9] AuthProvider init, token exists:", !!token);
  //  return !!token;
 // });

  useEffect(() => {
    console.log("🔒 [10] Auth state changed:", { hasToken });
  }, [hasToken]);

  return (
    <AuthContext.Provider value={{ hasToken, setHasToken }}>
      {children}
    </AuthContext.Provider>
  );
};