import React, { useEffect, useState, useCallback } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import Methone from "methone";
import { MantineProvider } from "@mantine/core";
import Home from "./views/Home.tsx";

import Links from "./views/Links.tsx";
import Configuration from "./configuration.ts"; // Import the Configuration file
import useAuthorization from "./hooks/Authorization.tsx";
import axios from "axios";

// Interfaces
interface TokenSet {
  access_token: string;
  token_type: string;
  id_token: string;
  expires_at: number;
}

// Update UserInfo interface to match supported claims
interface UserInfo {
  sub: string;          // Username (e.g., "armanmo")
  email: string;        // Email address (e.g., "armanmo@kth.se")
  email_verified: boolean;
  ugkthid?: string;     // Optional KTH ID
  pls_admin?: boolean;  // Permission claims
  pls_user?: boolean;
  [key: string]: any;   // Allow for other pls_* claims
}

// Add these interfaces at the top with your other interfaces
interface DfunktMandate {
  start: string;
  end: string;
  role: {
    identifier: string;
    title: string;
    description: string;
  };
}

interface DfunktUser {
  mandates: DfunktMandate[];
  first_name: string;
  last_name: string;
  kthid: string;
  ugkthid: string;
}

// Add AuthContext at the top of the file
const AuthContext = React.createContext<{
  hasToken: boolean;
  setHasToken: (value: boolean) => void;
}>({ hasToken: false, setHasToken: () => {} });

// Add this before the App component, after your interfaces
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { hasToken } = React.useContext(AuthContext);

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setHasToken(!!token);
  }, []);

  useEffect(() => {
    console.log("👉 Current hasToken state:", hasToken);
  }, [hasToken]);

  const config = {
    system_name: "link-shortener",
    login_href: hasToken ? "/logout" : "/login",
    login_text: hasToken ? "Logga ut" : "Logga in",
    color_scheme: "light-blue",
    links: [
      <Link to="/shorten" key="methone-link-1">Förkorta</Link>,
      ...(hasToken ? [<Link to="/links" key="methone-link-2">Länkar</Link>] : []),
    ],
  };

  return (
    <AuthContext.Provider value={{ hasToken, setHasToken }}>
      <MantineProvider
        theme={{
          fontFamily: "Lato",
          headings: { fontFamily: "Lato" },
          primaryColor: "blue",
        }}
      >
        <BrowserRouter basename="/">
          <div id="application" className="light-blue">
            <Methone config={config} />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shorten" element={<Home />} />
              <Route path="/login" element={<LoginRedirect />} />
              <Route path="/logout" element={<Logout />} />
              <Route 
                path="/links" 
                element={
                  <ProtectedRoute>
                    <Links />
                  </ProtectedRoute>
                } 
              />
              <Route path="/auth/oidc-callback" element={<OIDCCallback />} />
            </Routes>
          </div>
        </BrowserRouter>
      </MantineProvider>
    </AuthContext.Provider>
  );
};

// ✅ Redirect to login with correct callback
const LoginRedirect = () => {
  useEffect(() => {
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/oidc-callback`);
    // Update scopes based on scopes_supported
    const authUrl = `${Configuration.oidcIssuer}/authorize?` + 
      `client_id=${Configuration.clientId}&` +
      `redirect_uri=${callbackUrl}&` +
      `response_type=code&` +
      `scope=openid profile email pls_*`; // Updated scopes based on scopes_supported

    console.log("🔄 Redirecting to OIDC:", authUrl);
    window.location.href = authUrl;
  }, []);

  return <div></div>;
};

// Add this new component
// Define TokenSet interface for TypeScript
interface TokenSet {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: number;
}

const OIDCCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setHasToken } = React.useContext(AuthContext);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      console.log("🔑 Authorization Code Received:", code);
      
      axios.post<TokenSet>('http://localhost:5000/api/auth/verify-code', 
        { code: code },
        { headers: { 'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}` } }
      )
      .then(tokenResponse => {
        console.log("🎟️ Full TokenSet:", tokenResponse.data);
        const accessToken = tokenResponse.data.access_token;

        return axios.get<UserInfo>('https://sso.datasektionen.se/op/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      })
      .then(userInfoResponse => {
        // Get all pls_* claims
        const plsClaims = Object.keys(userInfoResponse.data)
          .filter(key => key.startsWith('pls_'))
          .reduce((acc, key) => ({
            ...acc,
            [key]: userInfoResponse.data[key]
          }), {});

        const hasPermissions = Object.values(plsClaims).some(value => 
          Array.isArray(value) ? value.length > 0 : Boolean(value)
        );

        // Store basic user info first
        const basicUserData = {
          userInfo: userInfoResponse.data,
          permissions: hasPermissions ? plsClaims : "No special permissions",
          mandates: []
        };

        // Try to get mandates if ugkthid exists
        if (userInfoResponse.data.ugkthid) {
          return axios.get<DfunktUser>(
            `https://dfunkt.datasektionen.se/api/user/kthid/${userInfoResponse.data.ugkthid}/current`
          ).then(dfunktResponse => ({
            ...basicUserData,
            mandates: dfunktResponse.data.mandates
          }));
        }

        // Return basic user data without mandates if no ugkthid
        return basicUserData;
      })
      .then(({ userInfo, mandates, permissions }) => {
        console.log("👤 User Data:", {
          email: userInfo.email,
          username: userInfo.sub,
          ugkthid: userInfo.ugkthid, // Log this to verify
          permissions: permissions,
          mandates: mandates.length > 0 ? mandates : "No current mandates"
        });
        
        // Store all data
        localStorage.setItem("userData", JSON.stringify(userInfo));
        localStorage.setItem("userMandates", JSON.stringify(mandates));
        localStorage.setItem("token", userInfo.sub);
        setHasToken(true);
        
        navigate("/", { replace: true });
      })
      .catch(error => {
        console.error("❌ Authentication Error:", error.response?.data || error.message);
        localStorage.removeItem("userData");
        localStorage.removeItem("userMandates");
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      });
    } else {
      console.error("❌ No code received");
      navigate("/login", { replace: true });
    }
  }, [location, navigate, setHasToken]);

  return <div>Authenticating...</div>;
};

// ✅ Logout handler
const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("token");
    navigate("/shorten", { replace: true });
  }, [navigate]);

  return <div>Logging out...</div>;
};

export default App;
