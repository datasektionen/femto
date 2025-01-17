-- this schema is close to the original pico schema, but with some modifications

CREATE TABLE urls (
    slug VARCHAR(255) PRIMARY KEY, -- Shortened SLUG, e.g https://dtek.se/SLUG
    url VARCHAR(2000) NOT NULL,   -- Redirect address, URLs are generally less than 2000 characters
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Default to current timestamp
    user VARCHAR(255),            -- User identifier
    clicks INT DEFAULT 0,         -- Default clicks to 0
    expires TIMESTAMP DEFAULT NULL, -- Expiry date, default NULL
    description TEXT,             -- Description field
    mandate VARCHAR(255)          -- Optional mandate field
);
