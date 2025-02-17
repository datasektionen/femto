import React, { useEffect, useState } from "react";
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



const App = () => {
  const { pls, loading, hasToken, user } = useAuthorization();

  const config = {
    system_name: "link-shortener",
    login_href: hasToken ? "/logout" : "/login",
    login_text: hasToken ? "Logga ut" : "Logga in",
    color_scheme: "light-blue",
    links: [
      <Link to="/shorten" key="methone-link-1">
        Förkorta
      </Link>,
      // Only show Links link if user has token
      ...(hasToken ? [
        <Link to="/links" key="methone-link-2">
          Länkar
        </Link>,
      ] : []),
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
          <RemoveTokenFromURL />{" "}
          {/* Handle token removal inside BrowserRouter */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shorten" element={<Home />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/links" element={<Links />} />
          </Routes>
        </div>
      </BrowserRouter>
    </MantineProvider>
  );
};

// ✅ Separate component to remove token from URL
const RemoveTokenFromURL = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pls, loading, hasToken, user } = useAuthorization(); 

  useEffect(() => {
    console.log("Current Path:", location.pathname);
    console.log("Current Search Params:", location.search);

    // Match /token/:token in the URL
    const tokenMatch = location.pathname.match(/^\/token\/(.+)$/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      console.log("🔑 Token Found:", token);
      console.log("pls, loading, hasToken, user", pls, loading, hasToken, user);

      localStorage.setItem("token", token);

      // Redirect to the homepage (or "/shorten") without the token
      navigate("/", { replace: true });
    }
  }, [location, navigate]);

  return null;
};

// ✅ Redirect to login with correct callback
const LoginRedirect = () => {
  useEffect(() => {
    const callbackUrl = encodeURIComponent(window.location.origin + "/token/");
    console.log(
      "Redirecting to:",
      `${Configuration.loginApiUrl}/login?callback=${callbackUrl}`
    );
    window.location.href = `${Configuration.loginApiUrl}/login?callback=${callbackUrl}`;
  }, []);

  return <div></div>;
};

// Add this component before the export
const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Remove token from localStorage
    localStorage.removeItem("token");
    // Navigate to shorten page
    navigate("/shorten", { replace: true });
  }, [navigate]);

  return <div>Logging out...</div>;
};

// ...existing code...

export default App;
