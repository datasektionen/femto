interface AppConfig {
  loginApiUrl: string;
}

const Configuration: AppConfig = {
  loginApiUrl: process.env.REACT_APP_LOGIN_API_URL || "https://login.datasektionen.se",
};

export default Configuration;
