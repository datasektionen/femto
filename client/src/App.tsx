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

// ✅ Create a reusable Axios instance with Authorization header
const apiClient = axios.create({
  baseURL: Configuration.loginApiUrl,
  headers: {
    Authorization: localStorage.getItem("token")
      ? `Bearer ${localStorage.getItem("token")}`
      : "",
  },
});

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
  const { pls, loading, hasToken, user } = useAuthorization();
  const [userMandates, setUserMandates] = useState<Mandate[]>([]);
  const [allMandates, setAllMandates] = useState<Role[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);

  // Debugging to check user state
  useEffect(() => {
    console.log("👤 useAuthorization values:", { user, hasToken, pls, loading });
  }, [user, hasToken, pls, loading]);

  // ✅ Fetch user mandates only when `hasToken` is set
  const getUserMandates = useCallback(() => {
    if (!user) return;

    apiClient
      .get<{ mandates: Mandate[] }>(`/user/kthid/${user}/current`)
      .then((res) => {
        console.log("✅ Fetched User Mandates:", res.data.mandates);
        setUserMandates(res.data.mandates);
      })
      .catch((error) => console.error("❌ Failed to fetch user mandates:", error));
  }, [user]);

  const getAllMandates = useCallback(() => {
    apiClient
      .get<Role[]>("/roles")
      .then((res) => {
        console.log("✅ Fetched All Mandates:", res.data);
        setAllMandates(res.data);
      })
      .catch((error) => console.error("❌ Failed to fetch all mandates:", error));
  }, []);

  const getAllGroups = useCallback(() => {
    apiClient
      .get<Group[]>("/groups/all")
      .then((res) => {
        console.log("✅ Fetched All Groups:", res.data);
        setAllGroups(res.data);
      })
      .catch((error) => console.error("❌ Failed to fetch groups:", error));
  }, []);

  // ✅ Run API calls when `hasToken` changes
  useEffect(() => {
    if (hasToken) {
      getUserMandates();
      getAllMandates();
      getAllGroups();
    }
  }, [hasToken, getUserMandates, getAllMandates, getAllGroups]);

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
          <RemoveTokenFromURL />
          <Routes>
            <Route path="/" element={<Home userMandates={userMandates} pls={pls} hasToken={hasToken} />} />
            <Route path="/shorten" element={<Home userMandates={userMandates} pls={pls} hasToken={hasToken} />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/links" element={<Links user={user} userMandates={userMandates} allMandates={allMandates} pls={pls} allGroups={allGroups} />} />
          </Routes>
        </div>
      </BrowserRouter>
    </MantineProvider>
  );
};

// ✅ Handle token removal from URL
const RemoveTokenFromURL = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pls, loading, hasToken, user } = useAuthorization();

  useEffect(() => {
    console.log("🔄 Current Authorization State:", { user, hasToken, pls, loading, currentPath: location.pathname });

    const tokenMatch = location.pathname.match(/^\/token\/(.+)$/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      console.log("🔑 Token Found:", token);
      localStorage.setItem("token", token);
      navigate("/", { replace: true });
    }
  }, [location, navigate, user, hasToken, pls, loading]);

  return null;
};

// ✅ Redirect to login with correct callback
const LoginRedirect = () => {
  useEffect(() => {
    const callbackUrl = encodeURIComponent(window.location.origin + "/token/");
    console.log("🔄 Redirecting to:", `${Configuration.loginApiUrl}/login?callback=${callbackUrl}`);
    window.location.href = `${Configuration.loginApiUrl}/login?callback=${callbackUrl}`;
  }, []);

  return <div></div>;
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
