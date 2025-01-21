import React from "react";
import { BrowserRouter, Link } from "react-router-dom";
import Methone from "methone";
import { MantineProvider } from "@mantine/core";

const App = () => {
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
        <MantineProvider
            theme={{
                fontFamily: "Lato",
                headings: { fontFamily: "Lato" },
                primaryColor: "blue",
            }}
        >
            <BrowserRouter>
                <div id="application" className="light-blue">
                    <Methone config={config} />
                    <div style={{ padding: "20px", textAlign: "center" }}>
                        <h1>Welcome to the Example App</h1>
                        <p>This is an example body text on a blank page.</p>
                    </div>
                </div>
            </BrowserRouter>
        </MantineProvider>
    );
};

export default App;
