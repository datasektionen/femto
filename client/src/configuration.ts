const backendApiUrl = import.meta.env.VITE_BACKEND_ROOT || "https://femto.betasektionen.se";

/**
 * This file contains the configuration for the application.
 * It is used to set the backend API URL.
 * Add any other configuration settings here as needed.
 */

// Define the AppConfig interface
interface AppConfig {
    backendApiUrl: string;
}

// Create a configuration object
const Configuration: AppConfig = {
    backendApiUrl: backendApiUrl,
};

export default Configuration;
