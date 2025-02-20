-- Inserts for testing

INSERT INTO urls (slug, url, user_id, clicks, expires, description, mandate) 
VALUES 
('gh123', 'https://github.com/', 'alice', 42, '2025-12-31 23:59:59', 'GitHub homepage', 'opensource'),
('goo456', 'https://www.google.com/', 'bob', 10, NULL, 'Google search engine', 'search'),
('nyt789', 'https://www.nytimes.com/', 'charlie', 7, '2025-06-30 23:59:59', 'The New York Times homepage', 'news'),
('ytube', 'https://www.youtube.com/', 'dave', 99, '2026-01-01 00:00:00', 'YouTube video platform', 'videos'),
('wiki1', 'https://en.wikipedia.org/wiki/Main_Page', 'eve', 120, NULL, 'Wikipedia main page', 'reference');

-- Test inserts för gh123 (antaget id = 1)
INSERT INTO url_clicks (url_id, clicked_at)
VALUES 
(1, '2025-01-01 10:00:00'),
(1, '2025-01-01 11:15:00'),
(1, '2025-01-02 09:30:00'),
(1, '2025-01-02 14:45:00'),
(1, '2025-01-03 16:00:00')

