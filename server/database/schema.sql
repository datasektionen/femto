-- this schema is close to the original pico schema, but with some modifications

CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,    -- Auto-incrementing ID for Base62 encoding
    slug VARCHAR(255) UNIQUE,    -- Unique shortened SLUG
    url VARCHAR(2000) NOT NULL,  
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  
    user_id VARCHAR(255),        
    clicks INT DEFAULT 0,        
    expires TIMESTAMP DEFAULT NULL,  
    description TEXT,            
    mandate VARCHAR(255)         
);