
-- PostgreSQL schema for shortened links
CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE,
    url VARCHAR(2000) NOT NULL,
    date TIMESTAMPTZ DEFAULT now(),       -- UTC timestamp
    user_id VARCHAR(255),
    expires TIMESTAMPTZ DEFAULT NULL,     -- UTC timestamp
    description TEXT,
    group_identifier VARCHAR(255),
    display_group_name VARCHAR(255), 
    clicks BIGINT DEFAULT 0
);

-- Table to store URL clicks
CREATE TABLE IF NOT EXISTS url_clicks (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT REFERENCES urls(id) ON DELETE CASCADE,

    clicked_at TIMESTAMPTZ DEFAULT now(),  -- UTC timestamp
    language VARCHAR(10)
    --ip_address INET,      
    --user_agent TEXT       
);

-- Table to store blocked URLs
CREATE TABLE IF NOT EXISTS blockedurls (
    url VARCHAR(255) PRIMARY KEY

);

-- Function to increment clicks in the urls table
CREATE OR REPLACE FUNCTION increment_url_clicks()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE urls
    SET clicks = clicks + 1
    WHERE id = NEW.url_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function after insert on url_clicks
CREATE OR REPLACE TRIGGER url_click_insert_trigger
AFTER INSERT ON url_clicks
FOR EACH ROW
EXECUTE FUNCTION increment_url_clicks();

