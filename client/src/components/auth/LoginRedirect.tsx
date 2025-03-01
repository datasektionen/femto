import { useEffect } from 'react';
import Configuration from '../../configuration.ts';
import React from 'react';

export const LoginRedirect = () => {
  useEffect(() => {
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/oidc-callback`);
    const authUrl = `${Configuration.oidcIssuer}/authorize?` + 
      `client_id=${Configuration.clientId}&` +
      `redirect_uri=${callbackUrl}&` +
      `response_type=code&` +
      `scope=openid profile email pls_*`;

    console.log("🔄 Redirecting to OIDC:", authUrl);
    window.location.href = authUrl;
  }, []);

  return <div></div>;
};