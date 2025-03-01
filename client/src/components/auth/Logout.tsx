import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.ts';

export const Logout = () => {
  const navigate = useNavigate();
  const { setHasToken } = useAuth();

  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    localStorage.removeItem("userMandates");
    setHasToken(false);
    navigate("/shorten", { replace: true });
  }, [navigate, setHasToken]);

  return <div></div>;
};