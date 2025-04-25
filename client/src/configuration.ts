const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || "femto-dev";
const loginApiUrl = import.meta.env.VITE_LOGIN_API_URL || "https://sso.datasektionen.se";

interface AppConfig {
  loginApiUrl: string;
  clientId: string;
}

const Configuration: AppConfig = {
  loginApiUrl: loginApiUrl,
  clientId: CLIENT_ID,  
};

export default Configuration;
