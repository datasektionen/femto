DROP TABLE IF EXISTS url_clicks;
DROP TABLE IF EXISTS urls;

CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,    -- Auto-incrementing ID for Base62 encoding
    slug VARCHAR(255) UNIQUE,     -- Unique shortened SLUG
    url VARCHAR(2000) NOT NULL,  
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  
    user_id VARCHAR(255),        
    expires TIMESTAMP DEFAULT NULL,  
    description TEXT,            
    group_name VARCHAR(255)         
);

CREATE TABLE IF NOT EXISTS url_clicks (
  id BIGSERIAL PRIMARY KEY,
  url_id BIGINT REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  language VARCHAR(255) DEFAULT NULL
  --ip_address INET,      
  --user_agent TEXT       
);