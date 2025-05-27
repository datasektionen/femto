import { useEffect } from 'react';
import Configuration from '../configuration.ts';
import { Center, Loader, Text, Stack } from '@mantine/core';

export const LoginRedirect = () => {
    useEffect(() => {
        // Construct the backend login URL
        const backendLoginUrl = `${Configuration.backendApiUrl}/login`;

        console.log("[Auth] 🔄 Redirecting to backend login:", backendLoginUrl);
        // Redirect the user's browser to the backend endpoint
        window.location.href = backendLoginUrl;
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <Center style={{ height: '100vh' }}>
            <Stack align="center">
                <Loader size="xl" />
                <Text c="dimmed">Navigerar till inloggning...</Text>
            </Stack>
        </Center>
    );
};