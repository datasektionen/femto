import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../autherization/useAuth.ts';
import { TokenSet, UserInfo, DfunktUser } from '../../autherization/types.ts';

export const OIDCCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setHasToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      console.log("🔑 Authorization Code Received:", code);
      
      axios.post<TokenSet>(
        'http://localhost:5000/api/auth/verify-code', 
        { code: code },
        { headers: { 'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}` } }
      )
      .then(tokenResponse => {
        const accessToken = tokenResponse.data.access_token;
        return axios.get<UserInfo>('https://sso.datasektionen.se/op/userinfo', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      })
      .then(userInfoResponse => {
        const plsClaims = Object.keys(userInfoResponse.data)
          .filter(key => key.startsWith('pls_'))
          .reduce((acc, key) => ({
            ...acc,
            [key]: userInfoResponse.data[key]
          }), {});

        const hasPermissions = Object.values(plsClaims).some(value => 
          Array.isArray(value) ? value.length > 0 : Boolean(value)
        );

        const basicUserData = {
          userInfo: userInfoResponse.data,
          permissions: hasPermissions ? plsClaims : "No special permissions",
          mandates: []
        };

        if (userInfoResponse.data.ugkthid) {
          return axios.get<DfunktUser>(
            `https://dfunkt.datasektionen.se/api/user/kthid/${userInfoResponse.data.ugkthid}/current`
          ).then(dfunktResponse => ({
            ...basicUserData,
            mandates: dfunktResponse.data.mandates
          }));
        }
        return basicUserData;
      })
      .then(({ userInfo, mandates, permissions }) => {
        // Add detailed console log
        console.log("👤 User Information:", {
          username: userInfo.sub,
          email: userInfo.email,
          permissions: permissions,
          mandates: mandates.length > 0 ? mandates : "No mandates found"
        });

        localStorage.setItem("userData", JSON.stringify(userInfo));
        localStorage.setItem("userMandates", JSON.stringify(mandates));
        localStorage.setItem("token", userInfo.sub);
        setHasToken(true);
        navigate("/", { replace: true });
      })
      .catch(error => {
        console.error("❌ Authentication Error:", error);
        localStorage.removeItem("userData");
        localStorage.removeItem("userMandates");
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      });
    } else {
      console.error("❌ No code received");
      navigate("/login", { replace: true });
    }
  }, [location, navigate, setHasToken]);

  return <div></div>;
};