import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../autherization/useAuth.ts';

export const Logout = () => {
  const navigate = useNavigate();
  const { setHasToken } = useAuth();

  useEffect(() => {
    // Clear all auth-related data from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("userMandates");
    
    // Update auth context state
    setHasToken(false);
    
    // Navigate to the desired page
    navigate("/shorten", { replace: true });
  }, [navigate, setHasToken]);

  return <div></div>;
};