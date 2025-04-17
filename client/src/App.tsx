import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
import Methone from "methone";
import { MantineProvider } from "@mantine/core";
import Home from "./views/Home.tsx";
import Links from "./views/Links.tsx";
import LinkStats from "./views/LinkStats.tsx";

import { AuthProvider } from "./autherization/AuthContext.tsx";
import { useAuth } from "./autherization/useAuth.ts";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.tsx";
import { LoginRedirect } from "./components/auth/LoginRedirect.tsx";
import { Logout } from "./components/auth/Logout.tsx";
import { OIDCCallback } from "./components/auth/OIDCCallback.tsx";


const AppContent = () => {
  const { hasToken } = useAuth();

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
        <Route path="/links/:id/stats" element={<ProtectedRoute><LinkStats /></ProtectedRoute>} />
        <Route path="/auth/oidc-callback" element={<OIDCCallback />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MantineProvider
        theme={{
          fontFamily: "Lato",
          headings: { fontFamily: "Lato" },
          primaryColor: "blue",
        }}
      >
        <BrowserRouter basename="/">
          <AppContent />
        </BrowserRouter>
      </MantineProvider>
    </AuthProvider>
  );
};

export default App;
