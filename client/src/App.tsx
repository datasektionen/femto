import { BrowserRouter, Route, Routes, Link} from "react-router-dom";
import Methone from "methone"; // Import Methone (Header is optional)
import { MantineProvider } from "@mantine/core";
import Home from "./views/Home.tsx";
import Links from "./views/Links.tsx";
import { AuthProvider } from "./authorization/AuthContext.tsx";
import { useAuth } from "./authorization/useAuth.ts";
import { ProtectedRoute } from "./authentication/ProtectedRoute.tsx";
import { LoginRedirect } from "./authentication/LoginRedirect.tsx";
import { Logout } from "./authentication/Logout.tsx";
import { OIDCCallback } from "./authentication/OIDCCallback.tsx";
import Blacklist from "./views/Blacklist.tsx"; // Import Blacklist component
import LinkDetails from "./views/LinkDetails.tsx";

// This component renders the main application content, including Methone bar and routes
const AppContent = () => {
    const { hasToken, manageBlacklist } = useAuth(); // Get authentication status

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
            // Conditionally add "Svartlista" link if user is authenticated and has manageBlacklist permission
            ...(hasToken && manageBlacklist ? [<Link to="/blacklist" key="methone-link-3">Svartlista</Link>] : []),
        ],
    };

    return (
        // This div wraps Methone and the page content.
        // The className should match the color_scheme for styling.
        <div id="application" className='light-green'>
            {/* Render the Methone component with the config */}
            <Methone config={config} />

            {/* Define the application routes */}
            <Routes>
                {/* Public Routes - Accessible to all users */}
                <Route path="/" element={<Home />} />
                <Route path="/shorten" element={<Home />} />

                {/* Authentication Routes - Handle login/logout flow */}
                <Route path="/login" element={<LoginRedirect />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/auth/oidc-callback" element={<OIDCCallback />} />

                {/* Protected Routes - Require authentication */}
                {/* User Links Management */}
                <Route
                    path="/links"
                    element={
                        <ProtectedRoute>
                            <Links />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/links/:id/details"
                    element={
                        <ProtectedRoute>
                            <LinkDetails />
                        </ProtectedRoute>
                    }
                />

                {/* Admin/Management Routes - Require authentication and permissions */}
                <Route
                    path="/blacklist"
                    element={
                        <ProtectedRoute>
                            <Blacklist />
                        </ProtectedRoute>
                    }
                />
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
