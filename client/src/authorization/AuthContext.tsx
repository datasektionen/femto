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
    userGroups: any[] | null;
    groups: string[]; // New property for mandate group names
    hasGroup: (groupName: string) => boolean; // New helper function
    refreshAuthData: () => Promise<void>;
    isLoading: boolean;
    customLinks: boolean;
    manageLinks: boolean;
    manageBlacklist: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    hasToken: false,
    setHasToken: () => { },
    userData: null,
    userPermissions: null,
    userGroups: null,
    groups: [], // Initialize empty array
    hasGroup: () => false, // Initialize helper function
    refreshAuthData: async () => { },
    isLoading: false,
    customLinks: false,
    manageLinks: false,
    manageBlacklist: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasToken, setHasToken] = useState<boolean>(isAuthenticated());
    const [userData, setUserData] = useState<UserInfo | null>(null);
    const [userPermissions, setUserPermissions] = useState<PermissionObject[] | null>(null);
    const [userGroups, setUserGroups] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Fetch user data from the backend
    const refreshAuthData = async () => {
        console.log("🔄 Refreshing auth data from backend");

        if (!isAuthenticated()) {
            setHasToken(false);
            setUserData(null);
            setUserPermissions(null);
            setUserGroups(null);
            return;
        }

        setIsLoading(true);

        try {
            const authData = await fetchUserData();

            if (authData) {
                setUserData(authData.userData);
                setUserPermissions(authData.userPermissions);
                setUserGroups(authData.userGroups);
                console.log("✅ Auth data refreshed successfully");
            } else {
                // If fetch failed, clear user data
                setUserData(null);
                setUserPermissions(null);
                setUserGroups(null);
                setHasToken(false);
            }
        } catch (error) {
            console.error("❌ Error refreshing auth data:", error);
            setUserData(null);
            setUserPermissions(null);
            setUserGroups(null);
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
        MANAGE_BLACKLIST = 'manage-blacklist',
    }

    // Extract just the group names from userGroups
    const groups = userGroups
        ? userGroups
            .filter(group => group && group.group_name) // Filter out null or undefined values
            .map(group => group.group_name)               // Extract just the group_name
        : [];

    // Log groups for debugging
    useEffect(() => {
        console.log("Available groups:", groups);
        console.log("Full group objects with domains:", userGroups);
        console.log("Group names only:", groups);
        // Log group with domain format examples
        if (userGroups && userGroups.length > 0) {
            const exampleGroup = userGroups[0];
            console.log("Example group object:", exampleGroup);
            console.log("Example group with domain format:", `${exampleGroup.group_name}@${exampleGroup.group_domain}`);
        }
    }, [groups, userGroups]);

    // Update the groups getter to provide the full group objects
    const groupObjects = userGroups || [];

    // Check if user has a specific group by name and optional domain
    const hasGroup = (groupName: string, domain?: string): boolean => {
        if (domain) {
            return groupObjects.some(g =>
                g.group_name === groupName && g.group_domain === domain
            );
        }
        return groupObjects.some(g => g.group_name === groupName);
    };

    const customLinks = Boolean(
        userPermissions?.some(permission => permission.id === Permission.CREATE_CUSTOM_LINKS)
    );

    const manageLinks = Boolean(
        userPermissions?.some(permission => permission.id === Permission.VIEW_ALL_LINKS)
    );

    const manageBlacklist = Boolean(
        userPermissions?.some(permission => permission.id === Permission.MANAGE_BLACKLIST)
    );

    return (
        <AuthContext.Provider value={{
            hasToken,
            setHasToken,
            userData,
            userPermissions,
            userGroups,
            groups,           // Add the simple list of mandate groups
            hasGroup,         // Add the helper function
            refreshAuthData,
            isLoading,
            customLinks,
            manageLinks,
            manageBlacklist,
        }}>
            {children}
        </AuthContext.Provider>
    );
};