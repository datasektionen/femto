import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../autherization/useAuth.ts";
import { TokenSet, UserInfo, DfunktUser } from "../../autherization/types.ts";

export const OIDCCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setHasToken } = useAuth();

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

      axios
      // ska hämta userdata och permissions och mandates från verify code
      // skickar koden vi får från sso till vår backend
        .post<{ token: string; userData: any; userPermissions: any; userMandates: any }>(
          "http://localhost:5000/api/auth/verify-code",
          { code: code }
        )
        .then((response) => {
          console.log("✅ [4] Token and user data received from backend");
          const token = response.data.token;
          const userData = response.data.userData;
          const userPermissions = response.data.userPermissions;
          const userMandates = response.data.userMandates;
          
          // Store all data in localStorage
          localStorage.setItem("token", token);
          localStorage.setItem("userData", JSON.stringify(userData));
          localStorage.setItem("userPermissions", JSON.stringify(userPermissions));
          localStorage.setItem("userMandates", JSON.stringify(userMandates));
          
          // Add detailed console logs to display user information
          console.log("📧 User Email:", userData.email || "No email found");
          console.log("👤 Username:", userData.sub || userData.username || userData.user || "No username found");
          console.log("🔐 User Permissions:", userPermissions);
          console.log("🏢 User Mandates (Groups):", userMandates);
          
          setHasToken(true);
          sessionStorage.removeItem("processingAuth");
          navigate("/", { replace: true });
        })
        .catch((error) => {
          console.error(
            "❌ [5] Auth error:",
            error.response?.data || error.message
          );
          localStorage.removeItem("token");
          localStorage.removeItem("userData");
          localStorage.removeItem("userPermissions");
          localStorage.removeItem("userMandates");
          sessionStorage.removeItem("processingAuth");
          setHasToken(false);
          navigate("/login", { replace: true });
        });
    } else {
      console.log("❌ [6] No code received in callback");
      navigate("/login", { replace: true });
    }
  }, []);

  return <div>Authenticating...</div>;
};
