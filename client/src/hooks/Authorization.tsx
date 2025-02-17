import axios from "axios";
import { useEffect, useState } from "react";
import Configuration from "../configuration";

interface AuthorizationResponse {
    pls: string[];
    user: string;
}

// Hook that runs once on application mount. Checks the token (if any) and sets admin status and loading status
const useAuthorization = () => {
    const [pls, setPls] = useState<string[]>([]);
    const [user, setUser] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [hasToken, setHasToken] = useState<boolean>(false);
  
    useEffect(() => {
      const token = localStorage.getItem("token");
      setHasToken(!!token);
  
      if (token) {
        axios
          .get<AuthorizationResponse>("/api/check-token")
          .then((res) => {
            setPls(res.data.pls);
            setUser(res.data.user);
          })
          .catch(() => {
            setPls([]);
            setUser("");
          })
          .finally(() => setLoading(false));
      } else {
        setPls([]);
        setUser("");
        setLoading(false);
      }
    }, []);  // Reacts to changes on initial render, not re-runs unless the token is changed
  
    return { pls, loading, hasToken, user };
  };

export default useAuthorization;
