import { Router, Request, Response } from 'express';

const loginRouter = Router();

loginRouter.get('/', (req: Request, res: Response) => {
    // URL of the OIDC issuer (e.g., Keycloak, Auth0, etc.)
    const oidcIssuer = process.env.OIDC_ISSUER || 'https://sso.datasektionen.se';
    // Client ID of your application registered with the OIDC provider
    const clientId = process.env.OIDC_CLIENT_ID || 'femto-dev';
    // Frontend callback URL where the OIDC provider will redirect after authentication
    const frontendCallbackUrl = `${process.env.CLIENT_URL}/auth/oidc-callback` || 'http://localhost:3000/auth/oidc-callback'; // Adjust port/domain as needed

    // Encode the callback URL to make it URL-safe
    const callbackUrlEncoded = encodeURIComponent(frontendCallbackUrl);

    // Construct the authorization URL for the OIDC provider
    const authUrl = `${oidcIssuer}/op/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${callbackUrlEncoded}&` +
        `response_type=code&` +
        `scope=openid profile email pls_*`;

    // Send HTTP 302 Redirect
    res.redirect(authUrl);
});

export default loginRouter;