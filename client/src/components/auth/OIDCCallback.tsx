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
    if (sessionStorage.getItem('processingAuth')) {
      console.log("⚠️ [2] Auth already processing, preventing loop");
      return;
    }

    if (code) {
      console.log("🔑 [3] Authorization Code Received:", code);
      sessionStorage.setItem('processingAuth', 'true');

      axios.post<TokenSet>(
        "http://localhost:5000/api/auth/verify-code",
        { code: code },
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
          },
        }
      )
      .then((tokenResponse) => {
        console.log("✅ [4] Token received from backend");
        const accessToken = tokenResponse.data.access_token;
        localStorage.setItem("token", accessToken);
        return axios.get<UserInfo>("https://sso.datasektionen.se/op/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      })
      .then((userInfoResponse) => {
        console.log("👤 [5] User info received:", {
          email: userInfoResponse.data.email,
          sub: userInfoResponse.data.sub
        });

        const plsClaims = Object.keys(userInfoResponse.data)
          .filter((key) => key.startsWith("pls_"))
          .reduce(
            (acc, key) => ({
              ...acc,
              [key]: userInfoResponse.data[key],
            }),
            {}
          );

        const hasPermissions = Object.values(plsClaims).some((value) =>
          Array.isArray(value) ? value.length > 0 : Boolean(value)
        );

        const basicUserData = {
          userInfo: userInfoResponse.data,
          permissions: hasPermissions ? plsClaims : "No special permissions",
          mandates: [],
        };

        if (userInfoResponse.data.ugkthid) {
          return axios
            .get<DfunktUser>(
              `https://dfunkt.datasektionen.se/api/user/kthid/${userInfoResponse.data.ugkthid}/current`
            )
            .then((dfunktResponse) => ({
              ...basicUserData,
              mandates: dfunktResponse.data.mandates,
            }));
        }
        return basicUserData;
      })
      .then(({ userInfo, mandates, permissions }) => {
        console.log("💾 [6] Storing user data and navigating");
        localStorage.setItem("userData", JSON.stringify(userInfo));
        localStorage.setItem("userMandates", JSON.stringify(mandates));
        console.log("User permissions:", permissions);
        console.log("User mandates:", mandates);
        setHasToken(true);
        sessionStorage.removeItem('processingAuth');
        navigate("/", { replace: true });
      })
      .catch((error) => {
        console.error("❌ [7] Auth error:", error.response?.data || error.message);
        localStorage.removeItem("token");
        localStorage.removeItem("userData");
        localStorage.removeItem("userMandates");
        sessionStorage.removeItem('processingAuth');
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
