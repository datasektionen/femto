import { useEffect } from 'react';
import Configuration from '../configuration.ts';

export const LoginRedirect = () => {
  useEffect(() => {
    // Construct the backend login URL
    const backendLoginUrl = `${Configuration.backendApiUrl}/login`;

    console.log("[Auth] 🔄 Redirecting to backend login:", backendLoginUrl);
    // Redirect the user's browser to the backend endpoint
    window.location.href = backendLoginUrl;
  }, []); // Empty dependency array ensures this runs only once on mount

  return <div>Redirecting to login...</div>;
};