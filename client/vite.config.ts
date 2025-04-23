import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // Add or modify the server section
    port: 3000, // Specify the port here
    // Optional: Make the server accessible externally (e.g., on your local network)
    // host: true,
  },
  build: {
    sourcemap: false // Enable source maps for easier debugging
  },
})
