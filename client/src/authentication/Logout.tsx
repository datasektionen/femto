import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../authorization/useAuth.ts';
import { logout } from '../authorization/authApi.ts';
import { Center, Loader, Text, Stack } from '@mantine/core';

export const Logout = () => {
    const navigate = useNavigate();
    const { setHasToken } = useAuth();

    useEffect(() => {
        // Use the authApi logout function
        logout();

        // Update context
        setHasToken(false);

        // Navigate to home
        navigate('/', { replace: true });
    }, [navigate, setHasToken]);

    return (
        <Center style={{ height: '100vh' }}>
            <Stack align="center">
                <Loader size="xl" />
                <Text c="dimmed">Loggar ut...</Text>
            </Stack>
        </Center>
    );
};