const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || "";
const CLIENT_SECRET = process.env.REACT_APP_CLIENT_SECRET || "";

interface AppConfig {
  loginApiUrl: string;
  oidcIssuer: string;
  clientId: string;
  clientSecret: string;
}

const Configuration: AppConfig = {
  loginApiUrl: "https://sso.datasektionen.se",
  oidcIssuer: "https://sso.datasektionen.se/op",
  clientId: CLIENT_ID,  
  clientSecret: CLIENT_SECRET, 
};

export default Configuration;
