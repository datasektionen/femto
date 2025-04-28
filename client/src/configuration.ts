const CLIENT_ID = import.meta.env.CLIENT_ID || "";
const loginApiUrl = import.meta.env.OIDC_ISSUER || "https://sso.datasektionen.se";
const backendApiUrl = import.meta.env.API_URL || "http://localhost:5000";

interface AppConfig {
  loginApiUrl: string;
  clientId: string;
  backendApiUrl: string;
}

const Configuration: AppConfig = {
  loginApiUrl: loginApiUrl,
  clientId: CLIENT_ID,  
  backendApiUrl: backendApiUrl,
};

export default Configuration;
