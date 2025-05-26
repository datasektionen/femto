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
- **Optional Group Association** for links.
- **QR Code Generation** for shortened links.
- **Blacklist Management** for blocked URLs or slugs.
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
│       └── deploy-dual.yml             # GitHub Actions CI/CD configuration
├── client/                             # Frontend React (Vite) application
│   ├── public/                         # Static assets (icons, manifest)
│   ├── src/                            # Source code
│   │   ├── authorization/              # Auth context, hooks, OIDC logic
│   │   │   ├── authApi.ts              # Authentication API calls
│   │   │   ├── AuthContext.tsx         # React context for auth state
│   │   │   ├── types.ts                # Auth-related TypeScript types
│   │   │   └── useAuth.ts              # Auth hook
│   │   ├── components/                 # Reusable React components
│   │   │   ├── auth/                   # Authentication components
│   │   │   │   ├── LoginRedirect.tsx
│   │   │   │   ├── Logout.tsx
│   │   │   │   ├── OIDCCallback.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   └── LinkCreator.tsx         # Main link creation component
│   │   ├── types/                      # TypeScript type definitions
│   │   │   └── methone.d.ts            # Methone-specific types
│   │   ├── views/                      # Page components
│   │   │   ├── Blacklist.tsx           # Blacklist management page
│   │   │   ├── Home.tsx                # Main homepage
│   │   │   ├── LinkDetails.tsx         # Individual link statistics
│   │   │   └── Links.tsx               # User's links overview
│   │   ├── App.css                     # Application styles
│   │   ├── App.tsx                     # Main application component
│   │   ├── configuration.ts            # Configuration constants
│   │   ├── index.css                   # Global styles
│   │   ├── index.tsx                   # Application entry point
│   │   └── vite-env.d.ts               # Vite environment types
│   ├── .env                            # Environment variables (local)
│   ├── .env.example                    # Example environment variables
│   ├── .gitignore                      # Git ignore rules
│   ├── Dockerfile.client               # Docker configuration for client
│   ├── eslint.config.js                # ESLint configuration
│   ├── index.html                      # HTML template
│   ├── nginx.conf                      # Nginx configuration for Docker
│   ├── package.json                    # Dependencies and scripts
│   ├── tsconfig.app.json               # TypeScript config for app
│   ├── tsconfig.json                   # Main TypeScript configuration
│   ├── tsconfig.node.json              # TypeScript config for Node tools
│   └── vite.config.ts                  # Vite configuration
├── server/                             # Backend Express application
│   ├── database/                       # Database setup and schema
│   │   ├── insert.sql                  # Sample data insertion
│   │   └── schema.sql                  # Database schema definition
│   ├── src/                            # Source code
│   │   ├── controllers/                # Request handlers
│   │   │   ├── authController.ts       # Authentication logic
│   │   │   ├── blacklistController.ts  # Blacklist management
│   │   │   ├── linkController.ts       # Link CRUD operations
│   │   │   └── statusController.ts     # Health check endpoints
│   │   ├── middlewares/                # Express middleware
│   │   │   └── jwtAuthMiddleware.ts    # JWT token validation
│   │   ├── routes/                     # Route definitions
│   │   │   ├── apiRouter.ts            # API endpoints
│   │   │   ├── loginRouter.ts          # Authentication routes
│   │   │   └── redirectRouter.ts       # URL redirection logic
│   │   ├── services/                   # Business logic services
│   │   │   ├── cleanupService.ts       # Expired link cleanup
│   │   │   └── db.ts                   # Database connection and queries
│   │   └── index.ts                    # Server entry point
│   ├── .env                            # Environment variables (local)
│   ├── .env.example                    # Example environment variables
│   ├── .gitignore                      # Git ignore rules
│   ├── Dockerfile.server               # Docker configuration for server
│   ├── package.json                    # Dependencies and scripts
│   └── tsconfig.json                   # TypeScript configuration
├── docker-compose.yml                  # Docker Compose configuration
├── job.nomad.hcl                       # Nomad job specification
└── README.md                           # This file
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

- Copy `server/.env.example` to `server/.env` and fill in the values.
- Copy `client/.env.example` to `client/.env` and fill in the values.

---

### 3. Database Setup

The project includes SQL files for database initialization:

-   `server/database/schema.sql` - Contains the database schema
-   `server/database/insert.sql` - Contains sample data (optional)

Schema setup is run automatically.

---

### 4. Running with Docker (Recommended)

This is the easiest way to get all services (client, server, database) running together.

1.  Ensure your `server/.env` file has `POSTGRES_HOST=postgres`.
2.  Build and start the containers:

    ```bash
    docker-compose up --build -d
    ```

    -   `-d` runs the containers in the background.

This will:

-   Launch the **client** React app, accessible at [http://localhost:3000/](http://localhost:3000/)
-   Launch the **server** Express app, accessible at [http://localhost:5000/](http://localhost:5000/)
-   Launch a **PostgreSQL** database container, accessible to the server via the hostname `postgres`

#### Connecting to the Database (Docker)

1.  List running containers: `docker ps`
2.  Find the container ID for the `postgres` image.
3.  Connect using psql:

    ```bash
    docker exec -it [container-ID] psql -U your_db_user -d your_db_name
    ```

---

## Local Development without Docker

You can also run the client and server directly on your machine. Make sure you have a separate PostgreSQL instance running and accessible.

### Database Setup

1.  Create a PostgreSQL database
2.  Run the schema from `server/database/schema.sql`
3.  Optionally run `server/database/insert.sql` for sample data

### Server

```bash
cd server
npm install
npm run dev # Runs server with auto-restart on changes
```

### Client

```bash
cd client
npm install
npm run dev # Starts development server
```

The client app should start on [http://localhost:3000/](http://localhost:3000/).

---

## Usage

1.  **Login**: Access the client URL (e.g., [http://localhost:3000/](http://localhost:3000/)). Click the login button, which will redirect you to your OIDC provider.
2.  **Shorten a Link**: Once logged in, use the form on the homepage to enter a long URL. You can optionally provide a custom slug, expiry date, or associate a mandate.
3.  **View Links**: Navigate to the "Länkar" (Links) page to see links you have created.
4.  **View Stats**: Click on a link to view its detailed statistics.
5.  **Manage Blacklist**: Access the blacklist page to manage blocked URLs or slugs.
6.  **Redirect**: Navigate to `<SERVER_URL>/<slug>` (e.g., `http://localhost:5000/myslug`) to be redirected to the original long URL.

---

## FAQ

-   **Why is the client showing a blank page or login errors?**
    -   Ensure both `client/.env` and `server/.env` files exist and are correctly configured.
    -   Verify the `CLIENT_URL` in `server/.env` matches where your client is running.
    -   Check the browser console and network tab for specific errors.
    -   Ensure the backend server is running and accessible at the specified `VITE_BACKEND_ROOT`.

-   **Database connection issues?**
    -   Verify your PostgreSQL instance is running and accessible.
    -   Check that the database schema has been properly initialized.
    -   Ensure the connection parameters in `server/.env` are correct.
