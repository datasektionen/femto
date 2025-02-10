# Femto - Link Shortener

Tired of long links? Then we have the system just for you. Insert your long link, click on "Shorten" and voila, you have a link that's easy to remember.

The system is intended to be used only for section-related purposes, for example, to shorten links to forms and other resources.

## Features
- Simple interface for shortening links.
- Save and manage shortened links.
- User-friendly and fast.

## Technologies Used
- TypeScript
- React
- Express
- Node

## Installation
To set up the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/datasektionen/femto.git
   cd femto
   ```
2. Install Node
   
3. Install Docker

## Project Structure

```
femto/
├── client/                          # Frontend React application
│   ├── public/                      # Public assets
│   ├── src/                         # Source code
│   │   ├── ...                      # TODO
│   ├── Dockerfile.client            # Dockerfile for the client
├── database/                        # Database schema and initial data
│   ├── schemas.sql                  # SQL schema for the database
│   ├── inserts.sql                  # SQL inserts for initial data
├── server/                          # Backend Express application
│   ├── src/                         # Source code
│   │   ├── routes/                  # Express routers
│   │   │   ├── apiRouter.ts         # Router for API endpoints
│   │   │   ├── redirectRouter.ts    # Router for redirection based on slugs
│   │   ├── db.ts                    # Database connection setup
│   │   ├── index.ts                 # Entry point for the Express application
│   ├── Dockerfile.server            # Dockerfile for the server
├── docker-compose.yml               # Docker Compose configuration
├── README.md                        # Project documentation
```

## Run with Docker
To run this project using Docker, firstly enter the project directory in the terminal. Secondly, use the `docker-compose` command to build and run the project.

```bash
cd femto
docker-compose up --build
```

## Connect to Database
‼️Remember to `CREATE TABLE` and `INSERT` when running the project for the first time.‼️

To connect to the database through docker, first start the container using the previous commands.
Use `docker ps` to get a list of running containers.
Look up the container named `postgres:15` and copy the container ID.
Use the `docker exec` command below to connect to the database through docker.
Then you can run whatever SQL command.

```bash
docker ps
docker exec -it [container-ID] psql -U postgres -d mydatabase
```

## Develop
All development happens within the `dev` branch. Please branch off `dev` when you are implementing changes. Only stable builds are merged into `main`.

## License
This project is licensed under the MIT License. See the TODO file for more details.
