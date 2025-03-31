# Femto - Link Shortener

A simple **link-shortening** service built with **TypeScript**, **React**, and **Express**. Enter a long URL, and Femto generates a shorter, more memorable link. This system is intended for section-related purposes (e.g., linking forms, events, or other resources).

---

## Features

- **Shorten URLs** quickly and easily.  
- **Automatic Slug Generation** if none is provided.  
- **Custom Slug Support** (if slug is available).  
- **Database-Backed** with PostgreSQL.  

---

## Prerequisites

1. [Node.js](https://nodejs.org/), version must be 22 or higher. (for local development).
2. [Docker](https://www.docker.com/) (for containerized deployment).
3. [Docker Compose](https://docs.docker.com/compose/) (to orchestrate multiple containers).

---

## Project Structure

```
femto/
├── .github/
│   └── workflows/
│       └── deploy-dual.yml         # GitHub Actions CI/CD configuration
├── client/                          # Frontend React application
│   ├── public/                      # Public assets (index.html, icons, robots.txt, etc.)
│   ├── src/                         # Source code
│   │   ├── App.css
│   │   ├── App.test.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── index.tsx
│   │   ├── reportWebVitals.ts
│   │   ├── setupTests.ts
│   │   └── views/                  # React views (Home, Login, etc.)
│   ├── Dockerfile.client           # Dockerfile for building/serving the client
│   ├── nginx.conf                  # Configuration for Nginx
│   └── package.json                # Dependencies and scripts for the client
├── server/                          # Backend Express application
│   ├── database/                   # Database schema and test data
│   │   ├── insert.sql
│   │   └── schema.sql
│   ├── src/
│   │   ├── db.ts                   # Database connection setup
│   │   ├── index.ts                # Server entry point
│   │   ├── routes/
│   │   │   ├── apiRouter.ts        # /api/* endpoints
│   │   │   └── redirectRouter.ts   # Catch-all redirect router
│   │   └── utils/                  # Helper functions (insertLink, getLink, etc.)
│   ├── Dockerfile.server           # Dockerfile for building the server
│   ├── package.json                # Dependencies and scripts for the server
│   ├── tsconfig.json               # TypeScript compiler configuration
│   └── .gitignore
├── job.nomad.hcl                   # Nomad job specification
├── docker-compose.yml              # Docker Compose configuration (client, server, db)
├── .env                             # Environment variables (ignored by git)
└── README.md                       # Project documentation
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/datasektionen/femto.git
cd femto
```

### 2. Environment Variables

Create a `.env` file in the root (or inside `server`), and define:

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mydatabase
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
SERVER_PORT=5000
CLIENT_PORT=3000
```

- **Note**: If using Docker Compose, these variables are passed to each container through `docker-compose.yml`.  
- **Important**: Never commit your `.env` file to source control.

---

### 3. Running with Docker

Build and start the containers:

```bash
docker-compose up --build
```

This will:
- Launch the **client** React app on [http://localhost:3000/](http://localhost:3000/).  
- Launch the **server** Express app on port `SERVER_PORT` (default: 5000).  
- Launch a **PostgreSQL** database container on port `POSTGRES_PORT` (default: 5432).

#### Connecting to the Database

1. List running containers:

   ```bash
   docker ps
   ```

2. Find the `postgres:15` container ID and run:

   ```bash
   docker exec -it [container-ID] psql -U postgres -d mydatabase
   ```

3. You can manually run SQL commands there. By default, the `schema.sql` and `insert.sql` files are automatically run at startup (see `server/src/db.ts`).

---

## Local Development (Without Docker)

You can also run the client and server locally:

1. **Server**  
   ```bash
   cd server
   npm install
   npm run build
   npm start
   ```
   Make sure the `.env` variables are correct, or the database connection may fail.

2. **Client**  
   ```bash
   cd client
   npm install
   npm start
   ```
   The app should start on [http://localhost:3000/](http://localhost:3000/).

---

## Testing

- **Jest** (backend tests) can be integrated to test the server and database queries.  
- **React Testing Library** (already included) is used for frontend tests.

Run tests with:
```bash
# From the "server" folder:
npm test

# From the "client" folder:
npm test
```

---

## Usage

1. **Shorten a Link**:  
   - Go to the frontend at [http://localhost:3000/](http://localhost:3000/)  
   - Enter your link and click **Förkorta** (if integrated in the UI).
2. **Retrieve Shortened Links**:  
   - Access `<HOST>/api/links` (this returns all shortened links).
3. **Redirect by Slug**:  
   - Navigate to `<HOST>/<slug>` to be redirected to the original URL.

---

## Deployment

- The project includes a **Nomad** configuration (`job.nomad.hcl`), **GitHub Actions** for CI/CD (`.github/workflows/deploy-dual.yml`), and a **Dockerfile** for each service.  
- Adjust environment variables and server settings as needed for your production environment.

---

## Contributing

1. **Branch off `dev`** for new features or bug fixes.  
2. **Open a Pull Request** to merge into `dev` once changes are ready.  
3. **Keep changes minimal and well-described**.

## FAQ
- Why is the client just showing a blank page? You may need to provide the right environment variables in `.env`, this goes for both the client respectively the server.

---

## License

This project is licensed under the **MIT License**. See the `LICENSE` or [the MIT License text](https://opensource.org/licenses/MIT) for more details.
