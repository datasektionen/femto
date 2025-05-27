import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../authorization/useAuth.ts";
import { loginWithCode } from "../authorization/authApi.ts";
import { Center, Loader, Text, Stack } from "@mantine/core";

export const OIDCCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setHasToken, refreshAuthData } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        console.log("[Auth] 🔄 [1] OIDCCallback mounted");
        const params = new URLSearchParams(location.search);
        const code = params.get("code");

        // Check if we're already processing
        if (sessionStorage.getItem("processingAuth")) {
            console.log("[Auth] ⚠️ [2] Auth already processing, preventing loop");
            return;
        }

        if (code) {
            console.log("[Auth] 🔑 [3] Authorization Code Received:", code);
            sessionStorage.setItem("processingAuth", "true");

            loginWithCode(code)
                .then(() => {
                    console.log("[Auth] ✅ [4] Login successful");
                    setStatus('success');
                    setHasToken(true);
                    refreshAuthData();
                    navigate("/", { replace: true });
                })
                .catch(error => {
                    console.error("[Auth] ❌ Auth error:", error);
                    setStatus('error');
                    setHasToken(false);
                    setTimeout(() => navigate("/login", { replace: true }), 2000);
                })
                .finally(() => {
                    sessionStorage.removeItem("processingAuth");
                });
        } else {
            setStatus('error');
            setTimeout(() => navigate("/login", { replace: true }), 2000);
        }
    }, []);

    return (
        <Center style={{ height: '100vh' }}>
            <Stack align="center">
                <Loader size="xl" />
                <Text c="dimmed">
                    {status === 'loading' && 'Loggar in...'}
                    {status === 'success' && 'Inloggning lyckades, omdirigerar...'}
                    {status === 'error' && 'Inloggning misslyckades'}
                </Text>
            </Stack>
        </Center>
    );
};
