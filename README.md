# Femto - Link Shortener

A simple **link-shortening** service built with **TypeScript**, **React (Vite)**, **Mantine UI**, and **Express**. It uses **OIDC** for authentication and **JWT** for API authorization. Enter a long URL, and Femto generates a shorter, more memorable link. This system is intended for internal use (e.g., linking forms, events, or other resources).

---

## Features

- **Shorten URLs** quickly and easily via a web interface.
- **OIDC Authentication** for user login.
- **JWT Authorization** for protected API endpoints.
- **View/Manage** created links (for authenticated users).
- **View Link Statistics** (click counts, timestamps).
- **Automatic Slug Generation** if none is provided.
- **Custom Slug Support** (if slug is available).
- **Optional Expiry Dates** for links.
- **Optional Mandate Association** for links.
- **QR Code Generation** for shortened links.
- **Database-Backed** with PostgreSQL.

---

## Prerequisites

1.  [Node.js](https://nodejs.org/) v22 or higher (for local development).
2.  [Docker](https://www.docker.com/) (for containerized deployment).
3.  [Docker Compose](https://docs.docker.com/compose/) (to orchestrate multiple containers).
4.  Access to an **OIDC Provider** (like Keycloak, Auth0, or a custom one like `sso.datasektionen.se`) for authentication.

---

## Project Structure

```
femto/
├── .github/
│   └── workflows/
│       └── deploy-dual.yml         # GitHub Actions CI/CD configuration
├── client/                          # Frontend React (Vite) application
│   ├── public/                      # Static assets (index.html, icons, etc.)
│   ├── src/                         # Source code
│   │   ├── autherization/           # Auth context, hooks, OIDC logic
│   │   ├── components/              # Reusable React components (LinkCreator, auth components)
│   │   ├── views/                   # Page components (Home, Links, LinkStats)
│   │   ├── App.tsx                  # Main application component, routing
│   │   └── main.tsx                 # Application entry point (replaces index.tsx)
│   ├── Dockerfile                   # Dockerfile for building/serving the client
│   ├── nginx.conf                   # Configuration for Nginx (used in Docker)
│   ├── vite.config.ts               # Vite configuration
│   ├── tsconfig.json                # TypeScript configuration
│   ├── package.json                 # Dependencies and scripts
│   └── .env.example                 # Example environment variables for client
├── server/                          # Backend Express application
│   ├── src/
│   │   ├── db/                      # Database schema, setup, queries
│   │   ├── middleware/              # Express middleware (auth, error handling)
│   │   ├── routes/                  # API and redirect route definitions
│   │   ├── types/                   # Shared TypeScript types
│   │   └── index.ts                 # Server entry point
│   ├── Dockerfile                   # Dockerfile for building the server
│   ├── package.json                 # Dependencies and scripts
│   ├── tsconfig.json                # TypeScript configuration
│   ├── .env.example                 # Example environment variables for server
│   └── .gitignore
├── job.nomad.hcl                    # Nomad job specification
├── docker-compose.yml               # Docker Compose configuration (client, server, db)
└── README.md                        # This file
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/datasektionen/femto.git
cd femto
```

### 2. Environment Variables

This project requires separate environment variables for the client and server.

**A. Server Environment (`server/.env`)**

Copy `server/.env.example` to `server/.env` and fill in the values:

```bash
# Database credentials
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=your_db_name
# POSTGRES_HOST=localhost # Use 'postgres' if using docker-compose

# Secret key for signing JWT tokens (generate a strong random key)
JWT_SECRET=your_strong_random_jwt_secret

# Base URL where the frontend client will run (for CORS and redirects)
CLIENT_URL=http://localhost:5173 # Default Vite port

# OIDC/OAuth2 Client Credentials provided by your SSO provider
CLIENT_ID=your_oidc_client_id
CLIENT_SECRET=your_oidc_client_secret

# OIDC Issuer URL provided by your SSO provider
OIDC_ISSUER=https://your-sso-provider.com

# Full URL where the SSO provider should redirect back after authentication
# Should match the path handled by OIDCCallback.tsx in the client
REDIRECT_URI=http://localhost:5173/auth/oidc-callback

# Optional: API Key for external services (if needed)
# HIVE_API_KEY=your_hive_api_key_if_needed
```

**B. Client Environment (`client/.env`)**

Copy `client/.env.example` to `client/.env` and fill in the values:

```bash
# Base URL for the backend API server
VITE_API_URL=http://localhost:5000 # Default server port

# Base URL for the Single Sign-On (SSO) provider's authorization endpoint
VITE_LOGIN_API_URL=https://your-sso-provider.com

# Client ID provided by your authentication provider (must match server's CLIENT_ID)
VITE_CLIENT_ID=your_oidc_client_id
```

-   **Important**: Never commit your actual `.env` files to source control. The `.gitignore` files should prevent this.

---

### 3. Running with Docker (Recommended)

This is the easiest way to get all services (client, server, database) running together.

1.  Ensure your `server/.env` file has `POSTGRES_HOST=postgres`.
2.  Build and start the containers:
    ```bash
    docker-compose up --build -d
    ```
    *   `-d` runs the containers in the background.

This will:

-   Launch the **client** React app, accessible at [http://localhost:5173/](http://localhost:5173/) (or your `CLIENT_PORT`).
-   Launch the **server** Express app on port `5000` (or your `SERVER_PORT`).
-   Launch a **PostgreSQL** database container, accessible to the server via the hostname `postgres`.

#### Connecting to the Database (Docker)

1.  List running containers: `docker ps`
2.  Find the container ID for the `postgres` image.
3.  Connect using psql:
    ```bash
    docker exec -it [container-ID] psql -U your_db_user -d your_db_name
    ```
    (Use the `POSTGRES_USER` and `POSTGRES_DB` from your `server/.env`).

---

## Local Development (Without Docker)

You can also run the client and server directly on your machine. Make sure you have a separate PostgreSQL instance running and accessible.

1.  **Server**
    *   Ensure `server/.env` is configured correctly (especially database connection details like `POSTGRES_HOST=localhost`).
    ```bash
    cd server
    npm install
    npm run dev # Runs server with nodemon for auto-restarts
    # OR
    # npm run build
    # npm start # Runs the compiled version
    ```

2.  **Client**
    *   Ensure `client/.env` is configured correctly.
    ```bash
    cd client
    npm install
    npm run dev
    ```
    The client app should start, typically on [http://localhost:5173/](http://localhost:5173/).

---

## Testing

Test commands can be run from within the respective `client` or `server` directories:

```bash
# From the "server" folder:
npm test # (If Jest or another test runner is configured)

# From the "client" folder:
npm test # (Runs Vitest tests, if configured)
```

---

## Usage

1.  **Login**: Access the client URL (e.g., [http://localhost:5173/](http://localhost:5173/)). Click the login button, which will redirect you to your OIDC provider.
2.  **Shorten a Link**: Once logged in, use the form on the homepage to enter a long URL. You can optionally provide a custom slug, expiry date, or associate a mandate.
3.  **View Links**: Navigate to the "Länkar" (Links) page (if logged in) to see links you have created.
4.  **View Stats**: Click the stats icon next to a link on the "Länkar" page.
5.  **Redirect**: Navigate to `<SERVER_URL>/<slug>` (e.g., `http://localhost:5000/myslug`) to be redirected to the original long URL.

---

## Deployment

-   The project includes a **Nomad** configuration (`job.nomad.hcl`) which uses Nomad variables for secrets management.
-   **GitHub Actions** are configured for CI/CD (`.github/workflows/deploy-dual.yml`).
-   **Dockerfiles** are provided for containerizing the client and server.
-   Ensure all necessary environment variables (database credentials, OIDC secrets, JWT secret, URLs) are correctly configured in your deployment environment (e.g., Nomad variables, Kubernetes secrets).

---

## Contributing

1.  Branch off `main` (or `dev` if used) for new features or bug fixes.
2.  Open a Pull Request towards the main development branch.
3.  Keep changes focused and provide clear descriptions.

## FAQ

-   **Why is the client showing a blank page or login errors?**
    *   Ensure both `client/.env` and `server/.env` files exist and are correctly configured with all necessary variables (API URLs, OIDC details, Client ID).
    *   Verify the `CLIENT_URL` in `server/.env` and `REDIRECT_URI` match where your client is running and the callback path it uses.
    *   Check the browser console and network tab for specific errors.
    *   Ensure the backend server is running and accessible from the client at the specified `VITE_API_URL`.

---

## License

This project is licensed under the **MIT License**. See the `LICENSE` file or [the MIT License text](https://opensource.org/licenses/MIT) for more details.
