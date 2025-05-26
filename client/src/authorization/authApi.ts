import axios from 'axios';
import Configuration from '../configuration';

// Base API URL
const API_URL = Configuration.backendApiUrl;
interface AuthData {
    sub: string;
    email?: string;
    name?: string;
    [key: string]: any;
  userPermissions: PermissionObject[]; // Match the type in AuthContext
  userGroups: any[];
}

interface PermissionObject {
  id: string;
  scope: string | null;
}

/**
 * Login with authorization code
 */
export const loginWithCode = async (code: string): Promise<string> => {
  try {
    const response = await axios.post<{ token: string }>(
      `${API_URL}/api/auth/verify-code`,
      { code }
    );
    
    // Store only the token
    localStorage.setItem('token', response.data.token);
    return response.data.token;
  } catch (error) {
    console.error('[Auth] ❌ Login error:', error);
    localStorage.removeItem('token');
    throw error;
  }
};

/**
 * Fetch user data from the server using the JWT token
 */
export const fetchUserData = async (): Promise<AuthData | null> => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const response = await axios.get<AuthData>(
      `${API_URL}/api/auth/user-data`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`[Auth] ❌ Error fetching user data:`, error);

    // If unauthorized, clear token
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    
    return null;
  }
};

/**
 * Check if user is authenticated (has a token)
 */
export const isAuthenticated = (): boolean => {
  return Boolean(localStorage.getItem('token'));
};

/**
 * Logout: simply remove the token
 */
export const logout = (): void => {
  localStorage.removeItem('token');
};