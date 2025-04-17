import React, { useEffect } from "react";
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
        .post<{ token: string; userData: any }>(
          "http://localhost:5000/api/auth/verify-code",
          { code: code }
        )
        .then((response) => {
          console.log("✅ [4] Token received from backend");
          const token = response.data.token;
          const userData = response.data.userData;
          localStorage.setItem("token", token);
          localStorage.setItem("userData", JSON.stringify(userData));
          setHasToken(true);
          sessionStorage.removeItem("processingAuth");
          navigate("/", { replace: true });
        })
        .catch((error) => {
          console.error(
            "❌ [7] Auth error:",
            error.response?.data || error.message
          );
          localStorage.removeItem("token");
          localStorage.removeItem("userData");
          localStorage.removeItem("userMandates");
          sessionStorage.removeItem("processingAuth");
          setHasToken(false);
          navigate("/login", { replace: true });
        });
    } else {
      console.log("❌ [8] No code received in callback");
      navigate("/login", { replace: true });
    }
  }, []);

  return <div>Authenticating...</div>;
};
