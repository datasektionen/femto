import React, { useEffect } from "react";
import { BrowserRouter, Route, Routes, Link, useNavigate, useLocation } from "react-router-dom";
import Methone from "methone";
import { MantineProvider } from "@mantine/core";
import Home from './views/Home.tsx';
import Configuration from './configuration.ts'; // Import the Configuration file

const App = () => {
  const config = {
    system_name: "link-shortener",
    login_href: "/login", // This will trigger the login redirect
    login_text: "Logga in",
    color_scheme: "light-blue",
    links: [
      <Link to="/shorten" key="methone-link-1">
        Förkorta
      </Link>,
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
          <RemoveTokenFromURL /> {/* Handle token removal inside BrowserRouter */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shorten" element={<Home />} />
            <Route path="/login" element={<LoginRedirect />} />
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

  useEffect(() => {
    console.log("Current Path:", location.pathname);
    console.log("Current Search Params:", location.search);

    // Match /token/:token in the URL
    const tokenMatch = location.pathname.match(/^\/token\/(.+)$/);
    if (tokenMatch) {
      console.log("🔑 Token Found:", tokenMatch[1]);

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
    console.log("Redirecting to:", `${Configuration.loginApiUrl}/login?callback=${callbackUrl}`);
    window.location.href = `${Configuration.loginApiUrl}/login?callback=${callbackUrl}`;
  }, []);

  return <div></div>;
};

export default App;
