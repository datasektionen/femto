import React, { useEffect, useState, useCallback } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Methone from "methone";
import { MantineProvider } from "@mantine/core";
import Home from "./views/Home.tsx";

import Links from "./views/Links.tsx";
import Configuration from "./configuration.ts"; // Import the Configuration file
import useAuthorization from "./hooks/Authorization.tsx";
import axios from "axios";

// Interfaces
interface Mandate {
  id: string;
  role: string;
  start: string;
  end: string;
}

interface Role {
  id: string;
  title: string;
  description: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
}

const App = () => {
  console.log("App bootstrapping...")
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
            <Route path="/links" element={<Links  />} />
            <Route path="/auth/oidc-callback" element={<OIDCCallback />} />
          </Routes>
        </div>
      </BrowserRouter>
    </MantineProvider>
  );
};

// ✅ Redirect to login with correct callback
const LoginRedirect = () => {
  useEffect(() => {
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/oidc-callback`);
    // Use OIDC authorization endpoint
    const authUrl = `${Configuration.oidcIssuer}/authorize?` + 
      `client_id=${Configuration.clientId}&` +
      `redirect_uri=${callbackUrl}&` +
      `response_type=code&` +
      `scope=openid`;

    console.log("🔄 Redirecting to OIDC:", authUrl);
    window.location.href = authUrl;
  }, []);

  return <div>Redirecting to login...</div>;
};

// Add this new component
const OIDCCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      console.log("🔑 Authorization Code Received:", code);
      
      axios.post('http://localhost:5000/api/auth/verify-token', { token: code })
        .then(response => {
          // Log the complete response data
          console.log("📦 Complete response data:", response.data);
          
          // Store everything in localStorage
          localStorage.setItem("token", code);
          localStorage.setItem("data", JSON.stringify(response.data));
          
          // Log what was stored
          console.log("💾 Stored data:", {
            token: code,
            userData: response.data
          });
          
          navigate("/", { replace: true });
        })
        .catch(error => {
          console.error("❌ Token verification failed:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("data");
          navigate("/login", { replace: true });
        });
    } else {
      console.error("❌ No code received in callback");
      navigate("/login", { replace: true });
    }
  }, [location, navigate]);

  return <div>Verifying login...</div>;
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
