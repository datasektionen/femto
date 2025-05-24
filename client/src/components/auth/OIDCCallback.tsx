import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../authorization/useAuth.ts";
import { loginWithCode } from "../../authorization/authApi.ts";
import { Center, Loader } from "@mantine/core";

export const OIDCCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setHasToken, refreshAuthData } = useAuth();

  useEffect(() => {
    console.log("🔄 [1] OIDCCallback mounted");
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    // Check if we're already processing
    if (sessionStorage.getItem("processingAuth")) {
      console.log("⚠️ [2] Auth already processing, preventing loop");
      return;
    }

    if (code) {
      console.log("🔑 [3] Authorization Code Received:", code);
      sessionStorage.setItem("processingAuth", "true");

      loginWithCode(code)
        .then(() => {  // Remove the unused 'token' parameter
          console.log("✅ [4] Login successful");
          
          // Set token flag in context
          setHasToken(true);
          
          // Fetch user data from backend
          refreshAuthData();
          
          // Navigate home
          navigate("/", { replace: true });
        })
        .catch(error => {
          console.error("❌ [5] Auth error:", error);
          setHasToken(false);
          navigate("/login", { replace: true });
        })
        .finally(() => {
          sessionStorage.removeItem("processingAuth");
        });
    } else {
      console.log("❌ [6] No code received in callback");
      navigate("/login", { replace: true });
    }
  }, []);

  return (
    <Center style={{ height: '100vh' }}>
      <Loader size="xl" />
    </Center>
  );
};
