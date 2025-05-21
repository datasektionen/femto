-- Test-data för urls
INSERT INTO urls (slug, url, user_id, expires, description, group_name) 
VALUES 
  ('gh123', 'https://github.com/',         'armanmo',  '2025-12-31 23:59:59', 'GruppmedDomain1',       'grupp@domain1'),
  ('goo456','https://www.google.com/',     'armanmo', NULL,                'GruppmedDomain2',  'grupp@testarmedenlängre'),
  ('nyt789','https://www.nytimes.com/',    'armanmo','2025-06-30 23:59:59','The New York Times',    'news'),
  ('ytube','https://www.youtube.com/',     'mbene',   '2026-01-01 00:00:00',  'YouTube platform',      'videos'),
  ('wiki1','https://en.wikipedia.org/wiki/Main_Page','mbene',NULL,'Wikipedia main page','reference')
ON CONFLICT (slug) DO NOTHING;

-- Test-inserts för gh123 (url_id = 1), språk = 'sv-SE'
INSERT INTO url_clicks (url_id, clicked_at, language) VALUES
  (1, '2025-01-01 09:00:00', 'sv-SE'),
  (1, '2025-01-01 09:15:00', 'sv-SE'),
  (1, '2025-01-01 09:30:00', 'sv-SE'),
  (1, '2025-01-01 10:00:00', 'en-US'),
  (1, '2025-01-01 10:15:00', 'en-US'),
  (1, '2025-01-01 11:00:00', 'en-US'),
  (1, '2025-01-01 11:30:00', 'en-US'),
  (1, '2025-01-01 12:45:00', 'fr-FR'),
  (1, '2025-01-01 13:00:00', 'fr-FR'),
  (1, '2025-01-01 13:30:00', 'sv-SE'),

  (1, '2025-01-02 09:00:00', 'sv-SE'),
  (1, '2025-01-02 09:15:00', 'sv-SE'),
  (1, '2025-01-02 10:00:00', 'de-DE'),
  (1, '2025-01-02 10:05:00', 'de-DE'),
  (1, '2025-01-02 15:00:00', 'de-DE'),
  (1, '2025-01-02 16:45:00', 'de-DE'),
  (1, '2025-01-02 18:00:00', 'de-DE'),

  (1, '2025-01-03 00:30:00', 'de-DE'),
  (1, '2025-01-03 09:30:00', 'sv-SE'),
  (1, '2025-01-03 12:15:00', 'sv-SE'),
  (1, '2025-01-03 12:45:00', 'sv-SE'),
  (1, '2025-01-03 12:46:00', 'sv-SE'),
  (1, '2025-01-03 13:00:00', 'sv-SE'),
  (1, '2025-01-03 13:05:00', 'sv-SE'),
  (1, '2025-01-03 13:10:00', 'es-ES'),
  (1, '2025-01-03 15:10:00', 'es-ES'),
  (1, '2025-01-03 16:20:00', 'es-ES'),
  (1, '2025-01-03 18:30:00', 'es-ES'),
  (1, '2025-01-03 23:59:59', 'sv-SE');

-- Test-inserts för goo456 (url_id = 2), språk = 'en-US'
INSERT INTO url_clicks (url_id, clicked_at, language) VALUES
  (2, '2025-01-01 09:00:00', 'en-US'),
  (2, '2025-01-01 10:30:00', 'en-US'),
  (2, '2025-01-02 08:45:00', 'en-US'),
  (2, '2025-01-02 12:00:00', 'en-US'),
  (2, '2025-01-03 14:30:00', 'en-US');

-- Test-inserts för nyt789 (url_id = 3), språk = 'fr-FR'
INSERT INTO url_clicks (url_id, clicked_at, language) VALUES
  (3, '2025-01-01 08:00:00', 'fr-FR'),
  (3, '2025-01-01 09:45:00', 'fr-FR'),
  (3, '2025-01-02 07:30:00', 'fr-FR'),
  (3, '2025-01-02 11:00:00', 'fr-FR'),
  (3, '2025-01-03 13:15:00', 'fr-FR');

-- Test-inserts för ytube (url_id = 4), språk = 'de-DE'
INSERT INTO url_clicks (url_id, clicked_at, language) VALUES
  (4, '2025-01-01 07:00:00', 'de-DE'),
  (4, '2025-01-01 08:15:00', 'de-DE'),
  (4, '2025-01-02 06:30:00', 'de-DE'),
  (4, '2025-01-02 10:00:00', 'de-DE'),
  (4, '2025-01-03 12:00:00', 'de-DE');

-- Test-inserts för wiki1 (url_id = 5), språk = 'es-ES'
INSERT INTO url_clicks (url_id, clicked_at, language) VALUES
  (5, '2025-01-01 06:00:00', 'es-ES'),
  (5, '2025-01-01 07:30:00', 'es-ES'),
  (5, '2025-01-02 05:45:00', 'es-ES'),
  (5, '2025-01-02 09:00:00', 'es-ES'),
  (5, '2025-01-03 11:30:00', 'es-ES');