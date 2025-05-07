DROP TABLE IF EXISTS url_clicks;
DROP TABLE IF EXISTS urls;

CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE,
    url VARCHAR(2000) NOT NULL,
    date TIMESTAMPTZ DEFAULT now(),       -- UTC timestamp
    user_id VARCHAR(255),
    expires TIMESTAMPTZ DEFAULT NULL,     -- UTC timestamp
    description TEXT,
    group_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS url_clicks (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT REFERENCES urls(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ DEFAULT now(),  -- UTC timestamp
    language VARCHAR(10)
);