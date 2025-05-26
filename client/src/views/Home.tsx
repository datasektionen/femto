import { Box } from "@mantine/core";
import LinkCreator from "../components/LinkCreator.tsx";
import { Header } from "methone";
import { useEffect } from "react";
import { useAuth } from "../authorization/useAuth.ts";


const Home = () => {
    const {
        hasToken,
        userPermissions,
        customLinks,
        manageLinks,
        groups,
        userGroups,
        refreshAuthData
    } = useAuth();

    // Refresh auth data when component mounts
    useEffect(() => {
        refreshAuthData();
    }, []);

    // Check if user can create custom links
    const canCreateCustomLinks = customLinks;

    const canManageLinks = manageLinks;

    console.log("User permissions:", userPermissions);
    console.log("User groups:", groups);
    console.log("User can create custom links:", customLinks);
    console.log("User has token:", hasToken);
    console.log("User can manage all links:", canManageLinks);

    return (
        <>
            <Header title="Länkförkortare" />
            <Box id="content" p="md">
                {/* LinkCreator Component */}
                <LinkCreator
                    disabled={!hasToken}
                    custom={canCreateCustomLinks} // Only show custom field if user has permission
                    userGroups={userGroups || []}
                    showAdvancedOptions={(groups && groups.length > 0) || canCreateCustomLinks}

                />
            </Box>
        </>
    );
};

export default Home;