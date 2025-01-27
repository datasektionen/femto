# Femto - Länkförkortare

Trött på långa länkar? Då har vi systemet just för dig. Stoppa in din långa länk, klicka på "Förkorta" och vips har du en länk man lätt kommer ihåg.

Systemet är tänkt att endast användas i sektionsrelaterade ändamål för att exempelvis förkorta länkar till formulär och annat.

# Run with Docker

```bash
cd femto
docker-compose up --build
```

## Connect to database

```bash
docker ps
docker exec -it [container-ID] psql -U postgres -d mydatabase
```

Remember to initialize psql relations and data after starting the container for the first time.

# Develop

All development happens within the `dev` branch. Please branch off `dev` when you are implementing changes. Only stable builds are merged into `main`.
