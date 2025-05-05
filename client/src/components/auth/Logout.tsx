import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../autherization/useAuth.ts';
import { logout } from '../../autherization/authApi.ts';

export const Logout = () => {
  const navigate = useNavigate();
  const { setHasToken } = useAuth();

  useEffect(() => {
    // Use the authApi logout function
    logout();
    
    // Update context
    setHasToken(false);
    
    // Navigate to home
    navigate('/', { replace: true });
  }, [navigate, setHasToken]);

  return <div>Logging out...</div>;
};