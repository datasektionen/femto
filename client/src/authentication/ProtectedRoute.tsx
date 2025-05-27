import { useAuth } from '../authorization/useAuth.ts';
import React from 'react';
import { Box, Card, Title, Text, Button, Stack, Center, ThemeIcon } from '@mantine/core';
import { IconLock, IconLogin } from '@tabler/icons-react';
import { Link } from 'react-router-dom';


interface ProtectedRouteProps {
    children: React.ReactNode;
}
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {

    const { hasToken } = useAuth();

    if (!hasToken) {
        return (
            <>
                <Box id="content" p="md">
                    <Center style={{ height: '70vh' }}>
                        <Card shadow="sm" radius="lg" withBorder w="100%" maw={800} p="xl">
                            <Stack>
                                <ThemeIcon size={60} radius="lg" color="blue" variant="light" mx="auto">
                                    <IconLock size={30} />
                                </ThemeIcon>

                                <Title order={2} ta="center" mb="md">
                                    Inloggning krävs
                                </Title>

                                <Text c="dimmed" ta="center" mb="md">
                                    Du behöver vara inloggad för att komma åt denna sida.
                                </Text>

                                <Button
                                    leftSection={<IconLogin size={16} />}
                                    component={Link}
                                    to="/login"
                                    radius="md"
                                    variant="light"
                                    fullWidth
                                >
                                    Logga in
                                </Button>
                            </Stack>
                        </Card>
                    </Center>
                </Box>
            </>
        );
    }

    return <>{children}</>;
};