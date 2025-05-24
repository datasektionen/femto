import { BrowserRouter, Route, Routes, Link, Navigate } from "react-router-dom";
import Methone /*, { Header } */ from "methone"; // Import Methone (Header is optional)
import { MantineProvider } from "@mantine/core";
import Home from "./views/Home.tsx";
import Links from "./views/Links.tsx";
import { AuthProvider } from "./authorization/AuthContext.tsx";
import { useAuth } from "./authorization/useAuth.ts";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.tsx";
import { LoginRedirect } from "./components/auth/LoginRedirect.tsx";
import { Logout } from "./components/auth/Logout.tsx";
import { OIDCCallback } from "./components/auth/OIDCCallback.tsx";
import Blacklist from "./views/Blacklist.tsx"; // Import Blacklist component
import LinkDetails from "./views/LinkDetails.tsx";

// This component renders the main application content, including Methone bar and routes
const AppContent = () => {
    const { hasToken, manageLinks } = useAuth(); // Get authentication status

    // Define the configuration for Methone, as per the documentation
    const config = {
        system_name: "link-shortener",
        color_scheme: 'light-green', // Switched to light-green to make Raf happy
        login_href: hasToken ? "/logout" : "/login",
        login_text: hasToken ? "Logga ut" : "Logga in",
        links: [
            // Use React Router <Link> components as shown in the docs
            <Link to="/shorten" key="methone-link-1">Förkorta</Link>,
            // Conditionally add "Länkar" link if user is authenticated
            ...(hasToken ? [<Link to="/links" key="methone-link-2">Länkar</Link>] : []),
            // Conditionally add "Svartlista" link if user is authenticated and has manageLinks permission
            ...(hasToken && manageLinks ? [<Link to="/blacklist" key="methone-link-3">Svartlista</Link>] : []),
        ],
    };

    return (
        // This div wraps Methone and the page content.
        // The className should match the color_scheme for styling.
        <div id="application" className='light-green'>
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
                <Route
                    path="/blacklist"
                    element={
                        manageLinks ? (
                            <Blacklist />
                        ) : (
                            <Navigate to="/" replace /> // Redirect to home if logged in but no manageLinks permission
                        )
                    }
                />
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
                <Route path="/links/:id/details" element={<ProtectedRoute><LinkDetails /></ProtectedRoute>} />
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
                    primaryColor: "green", // Adjust Mantine theme as needed
                    components: { // Override default Mantine component styles, this is required to prevent animation bugs
                        Select: {
                            defaultProps: {
                                comboboxProps: {
                                    transitionProps: {
                                        transition: 'pop-top-left',
                                        duration: 70,
                                    },
                                },
                            },
                        },
                        Tooltip: {
                            defaultProps: {
                                transitionProps: {
                                    transition: 'pop',
                                    duration: 70,
                                },
                            },
                        },
                    },
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
