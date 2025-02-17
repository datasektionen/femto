import React from "react";
import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
import Methone from "methone";
import { MantineProvider } from "@mantine/core";
import Home from "./views/Home.tsx";
import Login from "./views/Login.tsx";
import QRCodeGenerator from "./components/QRCodeGenerator.tsx";

const App = () => {
  // taken example from methone documentation
  const config = {
    system_name: "link-shortener",
    login_href: "/login",
    login_text: "Logga in",
    color_scheme: "light-blue",
    links: [
      <Link to="/shorten" key="methone-link-1">
        Förkorta
      </Link>,
    ],
  };

  return (
    // MantineProvider is a wrapper for the entire application
    <MantineProvider
      theme={{
        fontFamily: "Lato",
        headings: { fontFamily: "Lato" },
        primaryColor: "blue",
      }}
    >
      <BrowserRouter basename="/">
        <div id="application" className="light-blue">
          {/* Methone component is used to render the header */}
          <Methone config={config} />
          <Routes>
            {/* Define routes for Home, Login, and QRCodeGenerator */}
            <Route path="/" element={<Home />} />
            <Route path="/shorten" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/generate-qr"
              element={<QRCodeGenerator link="https://datasektionen.se/" />}
            />
          </Routes>
        </div>
      </BrowserRouter>
    </MantineProvider>
  );
};

export default App;
