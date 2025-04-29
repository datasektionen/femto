import { createContext, useState, useEffect } from 'react';
import { fetchUserData, isAuthenticated } from "./authApi.ts";

// Types
interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface AuthContextType {
  hasToken: boolean;
  setHasToken: (value: boolean) => void;
  userData: UserInfo | null;
  userPermissions: string[] | null;
  userMandates: any[] | null;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  hasMandateRole: (roleIdentifier: string) => boolean;
  refreshAuthData: () => Promise<void>;
  isLoading: boolean;
  customLinks: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  hasToken: false,
  setHasToken: () => {},
  userData: null,
  userPermissions: null,
  userMandates: null,
  isAdmin: false,
  hasPermission: () => false,
  hasMandateRole: () => false,
  refreshAuthData: async () => {},
  isLoading: false,
  customLinks: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasToken, setHasToken] = useState<boolean>(isAuthenticated());
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);
  const [userMandates, setUserMandates] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch user data from the backend
  const refreshAuthData = async () => {
    console.log("🔄 Refreshing auth data from backend");
    
    if (!isAuthenticated()) {
      setHasToken(false);
      setUserData(null);
      setUserPermissions(null);
      setUserMandates(null);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const authData = await fetchUserData();
      
      if (authData) {
        setUserData(authData.userData);
        setUserPermissions(authData.userPermissions);
        setUserMandates(authData.userMandates);
        console.log("✅ Auth data refreshed successfully");
      } else {
        // If fetch failed, clear user data
        setUserData(null);
        setUserPermissions(null);
        setUserMandates(null);
        setHasToken(false);
      }
    } catch (error) {
      console.error("❌ Error refreshing auth data:", error);
      setUserData(null);
      setUserPermissions(null);
      setUserMandates(null);
      setHasToken(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data on mount and when hasToken changes
  useEffect(() => {
    if (hasToken) {
      refreshAuthData();
    }
  }, [hasToken]);

  // Derived state for common permission check
  const isAdmin = Boolean(
    userPermissions?.includes('femto.admin')
  );

  // kanske göra såhär
  /** const customLinks = Boolean(
    userPermissions?.includes('femto.customlinks')
  );
  */
  

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!userPermissions) return false;
    if (userPermissions.includes('femto.admin')) return true;
    if (userPermissions.includes(permission)) return true;
    
    // Handle wildcard permissions
    const parts = permission.split('.');
    for (let i = parts.length; i > 0; i--) {
      const wildcardPerm = [...parts.slice(0, i), '*'].join('.');
      if (userPermissions.includes(wildcardPerm)) return true;
    }
    
    return false;
  };

  // Check if user has a specific mandate role
  const hasMandateRole = (roleIdentifier: string): boolean => {
    if (!userMandates || !Array.isArray(userMandates)) return false;
    
    return userMandates.some(mandate => 
      mandate.role?.identifier === roleIdentifier
    );
  };

  return (
    <AuthContext.Provider value={{
      hasToken,
      setHasToken,
      userData,
      userPermissions,
      userMandates,
      isAdmin,
      hasPermission,
      hasMandateRole,
      refreshAuthData,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};