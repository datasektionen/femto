import React, { useState } from "react";
import { Button, TextInput, Group, Alert, Box } from "@mantine/core";
import { Header } from "methone";
// import LinkCreator from "../components/LinkCreator.tsx";

const Home = () => {
  return (
    <>
      <Header title="Länkförkortare" />
      <div id="content">
        <div
          style={{
            marginBottom: "25px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <p>
            Trött på långa länkar? Då har vi systemet just för dig. Stoppa in
            din långa länk, klicka på "Förkorta" och vips har du en länk man
            lätt kommer ihåg.
          </p>
          <p>Du kan testa genom att stoppa in example.com</p>
          <p>
            <b>
              Detta system får bara användas i sektionsrelaterade ändamål. Du
              måste vara inloggad för att kunna förkorta en länk.
            </b>
          </p>
          <p>
            Tänk på vad som finns i länken du förkortar. Se till att länken inte
            innehåller några personliga tokens eller liknande.
          </p>
          <p>
            För att kunna specificera en förkortad länk, exempelvis "ior", måste
            du vara funktionär. Om du trots detta vill kunna specificera
            förkortade länkar för ett sektionsenligt ändamål, kontakta
            systemansvarig.
          </p>
        </div>

        {/* If you still want to keep the old functionality */}
        <div style={{ marginBottom: "25px" }}>
          <TextInput
            label="Lång länk"
            value={URL}
            // onChange={(e) => setUrl(e.target.value)}
            placeholder="Ange lång URL"
            style={{ marginBottom: "10px" }}
          />
          <Group position="center">
            <Button style={{ marginTop: "10px" }}>Förkorta länk</Button>
          </Group>
        </div>
      </div>
    </>
  );
};

export default Home;
