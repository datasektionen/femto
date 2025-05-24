import { useAuth } from '../../authorization/useAuth.ts';
import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { hasToken } = useAuth();

  if (!hasToken) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Lato' 
      }}>
        Hoppsan, verkar som att du inte loggat in
      </div>
    );
  }

  return <>{children}</>;
};