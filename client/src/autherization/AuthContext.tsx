import React, { createContext, useState} from 'react';
import { UserInfo } from './types';

interface AuthContextType {
  hasToken: boolean;
  setHasToken: (value: boolean) => void;
  userData: UserInfo | null;
  userPermissions: string[] | null;
  userMandates: any[] | null;
  isAdmin: boolean; // ta bort sen
  hasPermission: (permission: string) => boolean;
  hasMandateRole: (roleIdentifier: string) => boolean;
  refreshAuthData: () => void; // Add this function
}

export const AuthContext = createContext<AuthContextType>({
  hasToken: false,
  setHasToken: () => {},
  userData: null,
  userPermissions: null,
  userMandates: null,
  isAdmin: false, // ta bort sen
  hasPermission: () => false,
  hasMandateRole: () => false,
  refreshAuthData: () => {}, // Add this function
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasToken, setHasToken] = useState<boolean>(() => {
    const token = localStorage.getItem('token');
    return !!token;
  });

  const [userData, setUserData] = useState<UserInfo | null>(() => {
    const data = localStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
  });

  const [userPermissions, setUserPermissions] = useState<string[] | null>(() => {
    const permissions = localStorage.getItem('userPermissions');
    return permissions ? JSON.parse(permissions) : null;
  });

  const [userMandates, setUserMandates] = useState<any[] | null>(() => {
    const mandates = localStorage.getItem('userMandates');
    return mandates ? JSON.parse(mandates) : null;
  });

  // Add a function to refresh all auth data from localStorage
  const refreshAuthData = () => {
    console.log("🔄 Refreshing auth data from localStorage");
    
    // Get token
    const token = localStorage.getItem('token');
    setHasToken(!!token);
    
    // If no token, clear user data
    if (!token) {
      setUserData(null);
      setUserPermissions(null);
      setUserMandates(null);
      return;
    }
    
    // Get user data
    try {
      const userData = localStorage.getItem('userData');
      setUserData(userData ? JSON.parse(userData) : null);
      
      const permissions = localStorage.getItem('userPermissions');
      setUserPermissions(permissions ? JSON.parse(permissions) : null);
      
      const mandates = localStorage.getItem('userMandates');
      setUserMandates(mandates ? JSON.parse(mandates) : null);
      
      console.log("✅ Auth data refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing auth data:", error);
    }
  };

  // Derived state for common permission check
  const isAdmin = Boolean(
    userPermissions?.includes('femto.admin') || 
    userData?.pls_admin
  );

  // Check if user has a specific permission (existing implementation)
  const hasPermission = (permission: string): boolean => {
    if (!userPermissions) return false;
    
    // Check for direct permission
    if (userPermissions.includes(permission)) return true;
    
    // Check for admin permission (admins have all permissions)
    if (userPermissions.includes('femto.admin')) return true;
    
    // Check for wildcard permissions
    const permissionParts = permission.split('.');
    for (let i = permissionParts.length; i > 0; i--) {
      const wildcardPermission = [...permissionParts.slice(0, i), '*'].join('.');
      if (userPermissions.includes(wildcardPermission)) return true;
    }
    
    return false;
  };

  // Check if user has a specific mandate role (existing implementation)
  const hasMandateRole = (roleIdentifier: string): boolean => {
    if (!userMandates || !Array.isArray(userMandates)) return false;
    
    // Check current date against mandate dates
    const now = new Date();
    
    return userMandates.some(mandate => {
      // Check if role matches
      if (mandate.role?.identifier !== roleIdentifier) return false;
      
      // Check if mandate is currently active
      const startDate = mandate.start ? new Date(mandate.start) : null;
      const endDate = mandate.end ? new Date(mandate.end) : null;
      
      return (!startDate || startDate <= now) && (!endDate || endDate >= now);
    });
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
      refreshAuthData  // Add the refresh function to the context
    }}>
      {children}
    </AuthContext.Provider>
  );
};