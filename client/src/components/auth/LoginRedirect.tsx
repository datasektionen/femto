import { useEffect } from 'react';
import Configuration from '../../configuration.ts';

export const LoginRedirect = () => {
  useEffect(() => {
    // Use the OIDC issuer base URL
    const oidcIssuer = Configuration.loginApiUrl || 'https://sso.datasektionen.se';
    
    // Add the /op/ path segment which is missing
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/oidc-callback`);
    const authUrl = `${oidcIssuer}/op/authorize?` + 
      `client_id=${Configuration.clientId || 'femto-dev'}&` +
      `redirect_uri=${callbackUrl}&` +
      `response_type=code&` +
      `scope=openid profile email pls_*`;

    console.log("🔄 Redirecting to OIDC:", authUrl);
    window.location.href = authUrl;
  }, []);

  return <div></div>;
};