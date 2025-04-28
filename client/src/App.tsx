import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
import Methone /*, { Header } */ from "methone"; // Import Methone (Header is optional)
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


// This component renders the main application content, including Methone bar and routes
const AppContent = () => {
  const { hasToken } = useAuth(); // Get authentication status

  // Define the configuration for Methone, as per the documentation
  const config = {
    system_name: "link-shortener",
    color_scheme: 'light-blue', // Make sure this color scheme is valid in Methone
    login_href: hasToken ? "/logout" : "/login",
    login_text: hasToken ? "Logga ut" : "Logga in",
    links: [
      // Use React Router <Link> components as shown in the docs
      <Link to="/shorten" key="methone-link-1">Förkorta</Link>,
      // Conditionally add links based on auth status
      ...(hasToken ? [<Link to="/links" key="methone-link-2">Länkar</Link>] : []),
    ],
  };

  return (
    // This div wraps Methone and the page content.
    // The className should match the color_scheme for styling.
    <div id="application" className='light-blue'>
      {/* Render the Methone component with the config */}
      <Methone config={config} />

      {/* Optional: Add the Methone Header component here if needed */}
      {/* <Header title="Your Page Title"> */}
      {/*   Optional back link */}
      {/*   <Link to="/">« Tillbaka</Link> */}
      {/* </Header> */}

      {/* Define the application routes */}
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

// The main App component sets up providers and the router
const App = () => {
  return (
    // AuthProvider should wrap everything needing auth context
    <AuthProvider>
      {/* MantineProvider for UI components */}
      <MantineProvider
        theme={{
          scale: 1.5, // Adjust the scale for all components
          fontFamily: "Lato",
          headings: { fontFamily: "Lato" },
          primaryColor: "blue", // Adjust Mantine theme as needed
        }}
      >
        {/* BrowserRouter wraps the application content that uses routing */}
        <BrowserRouter basename="/">
          <AppContent />
        </BrowserRouter>
      </MantineProvider>
    </AuthProvider>
  );
};

export default App;
