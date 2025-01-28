# Femto - Länkförkortare

Trött på långa länkar? Då har vi systemet just för dig. Stoppa in din långa länk, klicka på "Förkorta" och vips har du en länk man lätt kommer ihåg.

Systemet är tänkt att endast användas i sektionsrelaterade ändamål för att exempelvis förkorta länkar till formulär och annat.

## Features
- Enkelt gränssnitt för att förkorta länkar.
- Spara och hantera förkortade länkar.
- Användarvänlig och snabb.

## Technologies Used
- TypeScript
- React
- Express
- Node
- PostgreSQL

## Installation
To set up the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/datasektionen/femto.git
   cd femto
   ```

2. Install Docker
   
3. Install Node.js

TODO

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

## Contact
For any inquiries, please contact us at TODO.
