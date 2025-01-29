import React from "react";
import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
import Methone from "methone";
import { MantineProvider } from "@mantine/core";
import Home from './views/Home.tsx';
import Login from './views/Login.tsx';

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
      <BrowserRouter>
        <div id="application" className="light-blue">
          {/* Methone component is used to render the header */}
          <Methone config={config} />
          <Routes>
            {/* Define routes for Home and Login */}
            <Route exact path="" element={<Home />} />
            <Route exact path="/shorten" element={<Home />} />
            <Route exact path="/login" element={<Login />} />
          </Routes>
        </div>
      </BrowserRouter>
    </MantineProvider>
  );
};

export default App;
