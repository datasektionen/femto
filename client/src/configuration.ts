const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || "";
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || "";

interface AppConfig {
  loginApiUrl: string;
  clientId: string;
}

const Configuration: AppConfig = {
  loginApiUrl: "https://sso.datasektionen.se",
  clientId: CLIENT_ID,  
};

export default Configuration;
