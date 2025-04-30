import { createContext, useState, useEffect } from 'react';
import { fetchUserData, isAuthenticated } from "./authApi.ts";

// Types
interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface PermissionObject {
  id: string;
  scope: string | null;
}

interface AuthContextType {
  hasToken: boolean;
  setHasToken: (value: boolean) => void;
  userData: UserInfo | null;
  userPermissions: PermissionObject[] | null;
  userMandates: any[] | null;
  mandateGroups: string[]; // New property for mandate group names
  hasMandateGroup: (groupName: string) => boolean; // New helper function
  refreshAuthData: () => Promise<void>;
  isLoading: boolean;
  customLinks: boolean;
  manageLinks: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  hasToken: false,
  setHasToken: () => {},
  userData: null,
  userPermissions: null,
  userMandates: null,
  mandateGroups: [], // Initialize empty array
  hasMandateGroup: () => false, // Initialize helper function
  refreshAuthData: async () => {},
  isLoading: false,
  customLinks: false,
  manageLinks: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasToken, setHasToken] = useState<boolean>(isAuthenticated());
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionObject[] | null>(null);
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
  
  enum Permission {
    CREATE_CUSTOM_LINKS = 'custom-links',
    VIEW_ALL_LINKS = 'manage-all',
  }

  // Extract just the group names from userMandates
  const mandateGroups = userMandates 
    ? userMandates
        .filter(mandate => mandate && mandate.group_name) // Filter out null or undefined values
        .map(mandate => mandate.group_name)               // Extract just the group_name
    : [];

  // Log mandate groups for debugging
  useEffect(() => {
    console.log("Available groups:", mandateGroups);
  }, [mandateGroups]);

  // Check if user has a specific mandate group
  const hasMandateGroup = (groupName: string): boolean => {
    return mandateGroups.includes(groupName);
  };

  const customLinks = Boolean(
    userPermissions?.some(permission => permission.id === Permission.CREATE_CUSTOM_LINKS)
  );
  
  const manageLinks = Boolean(
    userPermissions?.some(permission => permission.id === Permission.VIEW_ALL_LINKS)
  );


  return (
    <AuthContext.Provider value={{
      hasToken,
      setHasToken,
      userData,
      userPermissions,
      userMandates,
      mandateGroups,           // Add the simple list of mandate groups
      hasMandateGroup,         // Add the helper function
      refreshAuthData,
      isLoading,
      customLinks,
      manageLinks,
    }}>
      {children}
    </AuthContext.Provider>
  );
};