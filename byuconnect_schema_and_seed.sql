-- =============================================================================
-- BYUconnect Database Schema + Seed Data
-- =============================================================================
-- Reference date: 2026-03-23
-- All event timestamps are relative to that date.
-- Run with: psql $DATABASE_URL -f byuconnect_schema_and_seed.sql
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS announcements      CASCADE;
DROP TABLE IF EXISTS reservations       CASCADE;
DROP TABLE IF EXISTS event_saves        CASCADE;
DROP TABLE IF EXISTS club_memberships   CASCADE;
DROP TABLE IF EXISTS events             CASCADE;
DROP TABLE IF EXISTS clubs              CASCADE;
DROP TABLE IF EXISTS categories         CASCADE;
DROP TABLE IF EXISTS buildings          CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- users
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- buildings
CREATE TABLE buildings (
  id           SERIAL PRIMARY KEY,
  name         TEXT             NOT NULL,
  abbreviation TEXT             NOT NULL,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  address      TEXT             NOT NULL
);

-- categories
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT NOT NULL,
  icon  TEXT NOT NULL
);

-- clubs
CREATE TABLE clubs (
  id               SERIAL PRIMARY KEY,
  name             TEXT    NOT NULL,
  description      TEXT    NOT NULL,
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  avatar_initials  TEXT    NOT NULL,
  avatar_color     TEXT    NOT NULL,
  cover_image_url  TEXT,
  contact_email    TEXT    NOT NULL
);

-- events
CREATE TABLE events (
  id              SERIAL PRIMARY KEY,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  building_id     INTEGER     NOT NULL REFERENCES buildings(id),
  room_number     TEXT        NOT NULL,
  category_id     INTEGER     NOT NULL REFERENCES categories(id),
  club_id         INTEGER     NOT NULL REFERENCES clubs(id),
  capacity        INTEGER     NOT NULL,
  has_food        BOOLEAN     NOT NULL DEFAULT FALSE,
  cover_image_url TEXT,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- club_memberships  (composite PK)
CREATE TABLE club_memberships (
  user_id   INTEGER     NOT NULL REFERENCES users(id),
  club_id   INTEGER     NOT NULL REFERENCES clubs(id),
  role      TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'club_admin', 'owner')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, club_id)
);

-- event_saves  (composite PK)
CREATE TABLE event_saves (
  user_id  INTEGER     NOT NULL REFERENCES users(id),
  event_id INTEGER     NOT NULL REFERENCES events(id),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

-- reservations  (composite PK)
CREATE TABLE reservations (
  user_id     INTEGER     NOT NULL REFERENCES users(id),
  event_id    INTEGER     NOT NULL REFERENCES events(id),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

-- announcements
CREATE TABLE announcements (
  id         SERIAL PRIMARY KEY,
  club_id    INTEGER     NOT NULL REFERENCES clubs(id),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Buildings  (10 real BYU buildings with GPS coordinates)
INSERT INTO buildings (name, abbreviation, latitude, longitude, address) VALUES
  ('Wilkinson Student Center', 'WSC',  40.2469, -111.6489, 'Wilkinson Student Center, Provo, UT 84602'),
  ('Harold B. Lee Library',    'HBLL', 40.2466, -111.6497, '2060 HBLL, Provo, UT 84602'),
  ('Joseph F. Smith Building', 'JFSB', 40.2474, -111.6512, 'Joseph F. Smith Building, Provo, UT 84602'),
  ('Talmage Building',         'TLMG', 40.2485, -111.6478, 'Talmage Building, Provo, UT 84602'),
  ('Marriott Center',          'MC',   40.2512, -111.6515, 'Marriott Center, Provo, UT 84602'),
  ('Kimball Tower',            'KT',   40.2457, -111.6501, 'Kimball Tower, Provo, UT 84602'),
  ('Benson Building',          'BNSN', 40.2463, -111.6472, 'Benson Building, Provo, UT 84602'),
  ('Engineering Building',     'EB',   40.2479, -111.6467, 'Engineering Building, Provo, UT 84602'),
  ('Richards Building',        'RB',   40.2491, -111.6489, 'Richards Building, Provo, UT 84602'),
  ('LaVell Edwards Stadium',   'LES',  40.2571, -111.6548, 'LaVell Edwards Stadium, Provo, UT 84602');
-- IDs assigned: WSC=1, HBLL=2, JFSB=3, TLMG=4, MC=5, KT=6, BNSN=7, EB=8, RB=9, LES=10


-- Categories  (10 categories with brand colors)
INSERT INTO categories (name, color, icon) VALUES
  ('Academic',            '#0062B8', 'graduation-cap'),
  ('Social',              '#8B5CF6', 'users'),
  ('Service',             '#22C55E', 'heart'),
  ('Arts & Culture',      '#F97316', 'palette'),
  ('Sports & Fitness',    '#EF4444', 'trophy'),
  ('Technology',          '#06B6D4', 'cpu'),
  ('Religion & Faith',    '#F59E0B', 'star'),
  ('Career & Professional','#6366F1','briefcase'),
  ('International',       '#10B981', 'globe'),
  ('Food & Cooking',      '#EC4899', 'utensils');
-- IDs: Academic=1, Social=2, Service=3, Arts & Culture=4, Sports & Fitness=5,
--      Technology=6, Religion & Faith=7, Career & Professional=8, International=9, Food & Cooking=10


-- Clubs  (12 clubs)
INSERT INTO clubs (name, description, category_id, avatar_initials, avatar_color, contact_email) VALUES
  ('BYU CS Society',
   'A community of computer science enthusiasts dedicated to learning, networking, and building the future of technology together.',
   6, 'CS', '#0062B8', 'cs-society@byu.edu'),

  ('International Students Association',
   'Connecting international students with resources, friendships, and cultural exchange opportunities across the BYU community.',
   9, 'ISA', '#10B981', 'isa@byu.edu'),

  ('BYU Service Club',
   'Organizing meaningful service opportunities that make a difference locally, nationally, and globally.',
   3, 'SC', '#22C55E', 'service-club@byu.edu'),

  ('Finance & Investment Club',
   'Teaching practical investing skills, financial literacy, and economic awareness through workshops and competitions.',
   8, 'FIC', '#6366F1', 'finance-club@byu.edu'),

  ('BYU Photography Society',
   'Celebrating visual storytelling through photography walks, critiques, exhibitions, and community workshops.',
   4, 'PS', '#F97316', 'photo-society@byu.edu'),

  ('Debate & Oratory Club',
   'Sharpening critical thinking and public speaking skills through competitive debate and professional oratory practice.',
   1, 'DO', '#0062B8', 'debate@byu.edu'),

  ('BYU Ballroom Dance Club',
   'Bringing the joy of ballroom dance to the BYU campus with lessons, socials, and competitive performance opportunities.',
   4, 'BD', '#EC4899', 'ballroom@byu.edu'),

  ('Pre-Med Association',
   'Supporting pre-medical students with study groups, hospital shadowing, MCAT prep, and medical school application guidance.',
   1, 'PMA', '#EF4444', 'premed@byu.edu'),

  ('Entrepreneur Club',
   'Fostering the startup mindset through pitch competitions, mentorship from founders, and cross-disciplinary collaboration.',
   8, 'EC', '#F59E0B', 'entrepreneurs@byu.edu'),

  ('BYU Hiking & Outdoors',
   'Exploring Utah''s incredible landscapes through weekly hikes, camping trips, and outdoor skill-building adventures.',
   5, 'HO', '#22C55E', 'hiking@byu.edu'),

  ('Culinary Arts Society',
   'Learning world cuisines, cooking techniques, and hosting food events that bring the BYU community together.',
   10, 'CAS', '#EC4899', 'culinary@byu.edu'),

  ('LDS Business Society',
   'Connecting faith and professional life through speaker series, networking, and career development for LDS business students.',
   7, 'LBS', '#F59E0B', 'lbs@byu.edu'),

  ('Independent Students',
   'A space for students to host personal events that are not tied to a specific club.',
   9, 'IS', '#64748B', 'independent@byu.edu');
-- IDs: BYU CS Society=1, ISA=2, Service Club=3, Finance=4, Photography=5,
--      Debate=6, Ballroom=7, Pre-Med=8, Entrepreneur=9, Hiking=10, Culinary=11, LBS=12, Independent=13

-- Users
-- Seeded club admin accounts (one unique admin per club):
--   john_doe@byu.edu / byu123          -> BYU CS Society
--   isa_admin@byu.edu / isa123         -> International Students Association
--   service_admin@byu.edu / service123 -> BYU Service Club
--   finance_admin@byu.edu / finance123 -> Finance & Investment Club
--   photo_admin@byu.edu / photo123     -> BYU Photography Society
--   debate_admin@byu.edu / debate123   -> Debate & Oratory Club
--   ballroom_admin@byu.edu / ballroom123 -> BYU Ballroom Dance Club
--   premed_admin@byu.edu / premed123   -> Pre-Med Association
--   entrepreneur_admin@byu.edu / entre123 -> Entrepreneur Club
--   hiking_admin@byu.edu / hiking123   -> BYU Hiking & Outdoors
--   culinary_admin@byu.edu / culinary123 -> Culinary Arts Society
--   lbs_admin@byu.edu / lbs123         -> LDS Business Society
--   byu_admin@byu.edu / byuadmin123    -> Super Admin (manage all club admins)
INSERT INTO users (email, password_hash, first_name, last_name) VALUES
  ('john_doe@byu.edu', '$2b$12$fG6I82SZW6gIr0Bi9P8e4..I.Dfs5sVRqDkG3YzDD9Hoz4qF6PRoa', 'John', 'Doe'),
  ('isa_admin@byu.edu', '$2b$12$mldaFUbkdC9q6oMeUO9XWOB7h3ZzzCs2E07IwUqk7eL7UlugGVWQK', 'ISA', 'Admin'),
  ('service_admin@byu.edu', '$2b$12$lXCqO1lHIFKIxXb8hK7aweQLiEZr3jVxyRDTrkrerLkg7mWa0AXyi', 'Service', 'Admin'),
  ('finance_admin@byu.edu', '$2b$12$0ZnjAd9.xbOHbrjAw4t.HedE8pUFWC8GNZxRsO2PtyhB7Vlb2UAtC', 'Finance', 'Admin'),
  ('photo_admin@byu.edu', '$2b$12$KVrgf/hRQ2MznxF8IqIjvu7/36Dm3GFDSrZq0qepQg8ZD5Tzi8bRi', 'Photo', 'Admin'),
  ('debate_admin@byu.edu', '$2b$12$bDUNvbmQSqi3GjZkiLj3XOKsWOdxVfGSrQaSjdfEgEg3gRjqBZDEq', 'Debate', 'Admin'),
  ('ballroom_admin@byu.edu', '$2b$12$FP7yV/t206PYQiZkCj2K5OFK6UfWiY9glJ0pvq210QXkzpjAWNLPy', 'Ballroom', 'Admin'),
  ('premed_admin@byu.edu', '$2b$12$NpojTWYMdKnls0LXkbYSWeJCm44.VJTInuBqXNYgH1hbqq6zQvirG', 'PreMed', 'Admin'),
  ('entrepreneur_admin@byu.edu', '$2b$12$xWr3iCG6ZwIX/fOU8oZCb.2xXQX9dLSkmsGCNp63SG1JhUx4.ooKG', 'Entrepreneur', 'Admin'),
  ('hiking_admin@byu.edu', '$2b$12$dbypcu5oUHM34gm0Q9XjQefi4H4GskA6HUlP12FGLW3rC6vTIMMda', 'Hiking', 'Admin'),
  ('culinary_admin@byu.edu', '$2b$12$gLWh3PHGKBQfODGObOydeeXwvHUVeI1ELazWxLxwWFIgLbZK/BQG2', 'Culinary', 'Admin'),
  ('lbs_admin@byu.edu', '$2b$12$6b8euP.6NrMB90J9P96nnebO7.dM/rvbrCyoy39Jr0qT1zuo0KUpi', 'LDS', 'Admin'),
  ('byu_admin@byu.edu', '$2b$12$HGifI.uyItfo/R1wpgZlO./bi9GjpITLQJZrdfrYs5yvxcHI.IOyG', 'BYU', 'Admin');
-- IDs map to clubs 1..12 in insertion order above

-- Club memberships
INSERT INTO club_memberships (user_id, club_id, role) VALUES
  (1, 1, 'club_admin'),
  (2, 2, 'club_admin'),
  (3, 3, 'club_admin'),
  (4, 4, 'club_admin'),
  (5, 5, 'club_admin'),
  (6, 6, 'club_admin'),
  (7, 7, 'club_admin'),
  (8, 8, 'club_admin'),
  (9, 9, 'club_admin'),
  (10, 10, 'club_admin'),
  (11, 11, 'club_admin'),
  (12, 12, 'club_admin');


-- Events  (40 events spread over 14 days from 2026-03-23)
-- Column order: title, description, start_time, end_time,
--               building_id, room_number, category_id, club_id,
--               capacity, has_food, tags

INSERT INTO events
  (title, description, start_time, end_time, building_id, room_number, category_id, club_id, capacity, has_food, tags)
VALUES

-- ── Day 0 (2026-03-23) ──────────────────────────────────────────────────────
('Intro to Machine Learning',
 'Learn ML fundamentals with hands-on Python examples using scikit-learn and real datasets.',
 '2026-03-23 14:00:00+00', '2026-03-23 16:00:00+00',
 8, 'B101', 6, 1, 80, FALSE, ARRAY['ML','Python','workshop']),

('Resume Workshop for CS Majors',
 'Get personalized resume feedback from recruiters at top tech companies. Limited spots!',
 '2026-03-23 16:00:00+00', '2026-03-23 17:30:00+00',
 4, 'A201', 8, 1, 30, FALSE, ARRAY['career','resume','tech']),

('International Food Festival',
 'Taste dishes from 30+ countries prepared by BYU''s international student community. Free for all!',
 '2026-03-23 11:00:00+00', '2026-03-23 14:00:00+00',
 1, 'Ballroom', 9, 2, 300, TRUE, ARRAY['food','culture','international']),

('Ballroom Dance Social',
 'No experience needed! Learn basic waltz and tango steps in a fun, welcoming environment.',
 '2026-03-23 19:00:00+00', '2026-03-23 21:00:00+00',
 10, 'Main Floor', 4, 7, 100, FALSE, ARRAY['dance','social','beginner']),

('Pre-Med Study Session',
 'Group MCAT prep with upper-division pre-med students. Bring your materials and questions.',
 '2026-03-23 15:00:00+00', '2026-03-23 18:00:00+00',
 2, '4th Floor', 1, 8, 25, FALSE, ARRAY['MCAT','study','premed']),

-- ── Day 1 (2026-03-24) ──────────────────────────────────────────────────────
('Startup Pitch Competition',
 'Watch student entrepreneurs pitch their startup ideas to a panel of investors and win prizes.',
 '2026-03-24 18:00:00+00', '2026-03-24 20:00:00+00',
 3, 'B150', 8, 9, 120, TRUE, ARRAY['startup','pitch','business']),

('BYU Trails: Rock Canyon Hike',
 'Moderate 5-mile hike up Rock Canyon with stunning views of Utah Valley. Bring water and snacks.',
 '2026-03-24 08:00:00+00', '2026-03-24 12:00:00+00',
 10, 'Parking Lot A', 5, 10, 40, FALSE, ARRAY['hiking','outdoors','Rock Canyon']),

('World Languages Debate Night',
 'Debate hot topics in Spanish, French, Mandarin, or English. Open to all language levels!',
 '2026-03-24 19:30:00+00', '2026-03-24 21:30:00+00',
 4, '101', 1, 6, 50, FALSE, ARRAY['debate','languages','speaking']),

('Ramen Workshop: Japanese Cuisine',
 'Craft authentic tonkotsu ramen from scratch with our culinary instructors. Dinner included!',
 '2026-03-24 17:00:00+00', '2026-03-24 19:30:00+00',
 1, 'Kitchen Lab', 10, 11, 20, TRUE, ARRAY['cooking','Japanese','ramen']),

('LBS Speaker Series: Faith & Finance',
 'Successful LDS entrepreneur discusses aligning personal values with business decisions. Q&A included.',
 '2026-03-24 12:00:00+00', '2026-03-24 13:30:00+00',
 3, 'Auditorium', 7, 12, 200, FALSE, ARRAY['faith','finance','speaker']),

-- ── Day 2 (2026-03-25) ──────────────────────────────────────────────────────
('Night Photography Walk',
 'Explore campus after dark with long-exposure techniques. All camera levels welcome.',
 '2026-03-25 20:00:00+00', '2026-03-25 22:00:00+00',
 1, 'Main Entrance', 4, 5, 25, FALSE, ARRAY['photography','night','campus']),

('Community Service Day',
 'Help clean up local parks and trails. Gloves and bags provided. Lunch afterwards!',
 '2026-03-25 09:00:00+00', '2026-03-25 13:00:00+00',
 9, 'Lobby', 3, 3, 60, TRUE, ARRAY['service','community','outdoors']),

('Investment 101',
 'Introduction to stocks, ETFs, and crypto. No prior finance experience required.',
 '2026-03-25 17:00:00+00', '2026-03-25 19:00:00+00',
 6, '3rd Floor', 8, 4, 45, FALSE, ARRAY['investing','finance','beginner']),

-- ── Day 3 (2026-03-26) ──────────────────────────────────────────────────────
('Full Stack Web Dev Workshop',
 'Build a complete web app from scratch using React, Node, and PostgreSQL in one afternoon.',
 '2026-03-26 14:00:00+00', '2026-03-26 18:00:00+00',
 8, 'Lab 205', 6, 1, 35, TRUE, ARRAY['web dev','React','fullstack']),

('ISA Cultural Night: Asia Edition',
 'Experience music, dance, food, and traditions from across Asia in one incredible night.',
 '2026-03-26 18:30:00+00', '2026-03-26 21:30:00+00',
 10, 'Main Floor', 9, 2, 250, TRUE, ARRAY['culture','Asia','performance']),

('Saturday Morning Yoga',
 'Start your weekend right with an hour of yoga in the Richards Building gym. All levels welcome.',
 '2026-03-26 08:00:00+00', '2026-03-26 09:00:00+00',
 9, 'Gym Floor', 5, 10, 30, FALSE, ARRAY['yoga','fitness','morning']),

-- ── Day 4 (2026-03-27) ──────────────────────────────────────────────────────
('Hospital Shadowing Info Session',
 'Learn how to sign up for hospital shadowing opportunities at Utah Valley Hospital and others.',
 '2026-03-27 16:00:00+00', '2026-03-27 17:00:00+00',
 4, '200', 1, 8, 40, FALSE, ARRAY['shadowing','hospital','premed']),

('Networking Mixer: Business & Tech',
 'Meet students across business and tech disciplines. Exchange ideas and build your professional network.',
 '2026-03-27 19:00:00+00', '2026-03-27 21:00:00+00',
 3, 'Lobby', 8, 9, 80, TRUE, ARRAY['networking','professional','mixer']),

-- ── Day 5 (2026-03-28) ──────────────────────────────────────────────────────
('Modern Waltz Masterclass',
 'Intensive 2-hour session on waltz technique taught by a former competitive champion.',
 '2026-03-28 15:00:00+00', '2026-03-28 17:00:00+00',
 10, 'Studio B', 4, 7, 40, FALSE, ARRAY['waltz','masterclass','dance']),

('Vegetarian Cooking Class',
 'Explore plant-based cuisine with 5 quick, affordable, and delicious recipes you can make in your dorm.',
 '2026-03-28 17:00:00+00', '2026-03-28 19:00:00+00',
 1, 'Kitchen Lab', 10, 11, 18, TRUE, ARRAY['vegetarian','cooking','healthy']),

-- ── Day 6 (2026-03-29) ──────────────────────────────────────────────────────
('Mock Trial Competition',
 'Experience the courtroom with a simulated trial. Perfect for pre-law and debate enthusiasts.',
 '2026-03-29 13:00:00+00', '2026-03-29 16:00:00+00',
 4, 'Moot Court', 1, 6, 60, FALSE, ARRAY['debate','law','competition']),

('Charity Gala Planning Meeting',
 'Help organize our biggest fundraiser of the year. Volunteers needed for logistics, décor, and food.',
 '2026-03-29 17:00:00+00', '2026-03-29 18:30:00+00',
 1, 'Meeting Room 3', 3, 3, 30, FALSE, ARRAY['gala','fundraiser','volunteer']),

-- ── Day 7 (2026-03-30) ──────────────────────────────────────────────────────
('Stock Market Simulation Game',
 'Compete against peers in a week-long stock market simulation with real-time data. Cash prizes!',
 '2026-03-30 12:00:00+00', '2026-03-30 13:00:00+00',
 6, '200', 8, 4, 50, FALSE, ARRAY['stocks','competition','finance']),

('AI Ethics Panel Discussion',
 'A panel of CS faculty and students debate the ethical implications of AI in society.',
 '2026-03-30 17:00:00+00', '2026-03-30 19:00:00+00',
 8, 'Auditorium', 6, 1, 150, FALSE, ARRAY['AI','ethics','panel']),

('Timpanogos Cave Day Trip',
 'Guided tour of the spectacular Timpanogos Cave National Monument. Transportation provided!',
 '2026-03-30 07:00:00+00', '2026-03-30 15:00:00+00',
 10, 'Bus Pickup', 5, 10, 25, TRUE, ARRAY['cave','hiking','day trip']),

-- ── Day 8 (2026-03-31) ──────────────────────────────────────────────────────
('Portrait Photography Workshop',
 'Learn professional portrait lighting and posing techniques. Models provided.',
 '2026-03-31 14:00:00+00', '2026-03-31 17:00:00+00',
 4, 'Studio', 4, 5, 20, FALSE, ARRAY['portrait','photography','lighting']),

('Faith & Career: Finding Your Purpose',
 'A candid conversation about integrating faith principles into professional career choices.',
 '2026-03-31 18:00:00+00', '2026-03-31 19:30:00+00',
 3, 'Auditorium', 7, 12, 180, FALSE, ARRAY['faith','career','purpose']),

-- ── Day 9 (2026-04-01) ──────────────────────────────────────────────────────
('Global Health Crisis Simulation',
 'Participate in a realistic public health simulation responding to a fictional pandemic scenario.',
 '2026-04-01 13:00:00+00', '2026-04-01 17:00:00+00',
 4, 'B200', 1, 8, 35, FALSE, ARRAY['public health','simulation','global']),

('Tango Beginners Workshop',
 'Learn the passionate Argentine tango from a certified instructor. No partner needed to sign up!',
 '2026-04-01 19:00:00+00', '2026-04-01 21:00:00+00',
 10, 'Studio A', 4, 7, 50, FALSE, ARRAY['tango','beginner','dance']),

-- ── Day 10 (2026-04-02) ─────────────────────────────────────────────────────
('International Trivia Night',
 'Test your knowledge of world cultures, languages, and geography. Teams of 4, prizes for top 3!',
 '2026-04-02 19:00:00+00', '2026-04-02 21:00:00+00',
 1, 'Ballroom', 9, 2, 120, TRUE, ARRAY['trivia','international','social']),

('Hackathon Kickoff 2026',
 '48-hour hackathon starting now. Build something awesome with a team. Mentors and meals provided.',
 '2026-04-02 18:00:00+00', '2026-04-02 20:00:00+00',
 8, 'CS Building', 6, 1, 100, TRUE, ARRAY['hackathon','coding','competition']),

-- ── Day 11 (2026-04-03) ─────────────────────────────────────────────────────
('Feeding the Homeless Drive',
 'Help prepare and distribute meals at the Provo City Center. Transportation from campus provided.',
 '2026-04-03 10:00:00+00', '2026-04-03 14:00:00+00',
 9, 'Main Entrance', 3, 3, 40, FALSE, ARRAY['service','homeless','Provo']),

('Crypto & Blockchain 101',
 'Demystify cryptocurrency and blockchain technology with a technical but accessible workshop.',
 '2026-04-03 16:00:00+00', '2026-04-03 18:00:00+00',
 6, '305', 8, 4, 60, FALSE, ARRAY['crypto','blockchain','workshop']),

-- ── Day 12 (2026-04-04) ─────────────────────────────────────────────────────
('French & Italian Cuisine Night',
 'Cook classic dishes like bouillabaisse and risotto. Wine-free pairing alternatives included!',
 '2026-04-04 17:00:00+00', '2026-04-04 20:00:00+00',
 1, 'Kitchen Lab', 10, 11, 20, TRUE, ARRAY['French','Italian','cooking']),

('Entrepreneurship Bootcamp Day 1',
 'Intensive 3-day bootcamp on building a startup from idea to MVP. Registration required.',
 '2026-04-04 09:00:00+00', '2026-04-04 16:00:00+00',
 3, 'B150', 8, 9, 30, TRUE, ARRAY['bootcamp','startup','MVP']),

-- ── Day 13 (2026-04-05) ─────────────────────────────────────────────────────
('Mountain Bike Skills Clinic',
 'Learn essential mountain biking techniques on trails around Provo. Bikes available for rent.',
 '2026-04-05 09:00:00+00', '2026-04-05 13:00:00+00',
 10, 'Parking Lot B', 5, 10, 20, FALSE, ARRAY['biking','mountain bike','outdoor']),

('Senior Portrait Exhibition',
 'Annual showcase of senior photography students'' best work. Reception with light refreshments.',
 '2026-04-05 16:00:00+00', '2026-04-05 19:00:00+00',
 2, 'Gallery', 4, 5, 80, TRUE, ARRAY['exhibition','photography','art']),

-- ── Day 14 (2026-04-06) ─────────────────────────────────────────────────────
('Career Fair Prep Workshop',
 'Polish your elevator pitch, review your resume, and practice interviewing before the big career fair.',
 '2026-04-06 14:00:00+00', '2026-04-06 16:00:00+00',
 3, 'A100', 8, 12, 60, FALSE, ARRAY['career fair','interview','prep']),

('Medical Ethics Forum',
 'Faculty and students discuss real-world ethical dilemmas in modern medicine. Open forum format.',
 '2026-04-06 16:00:00+00', '2026-04-06 18:00:00+00',
 4, 'B300', 1, 8, 80, FALSE, ARRAY['ethics','medicine','forum']),

('Great Wall Chinese Cooking',
 'Master Peking duck, dim sum, and other Chinese classics with our expert culinary instructor.',
 '2026-04-06 17:30:00+00', '2026-04-06 20:00:00+00',
 1, 'Kitchen Lab', 10, 11, 16, TRUE, ARRAY['Chinese','cooking','dim sum']);


-- Announcements  (10 club announcements)
INSERT INTO announcements (club_id, title, body) VALUES
  (1,  'New semester, new projects!',
       'We''re kicking off the semester with exciting new projects. Join us at our first meeting to learn more about web dev, AI, and game dev tracks.'),

  (1,  'Hackathon registration open',
       'Sign up now for our 48-hour hackathon next week. Teams of 1-4, all skill levels welcome. Prizes up to $500!'),

  (2,  'Cultural Night planning meeting',
       'We need volunteers for our upcoming Asia Cultural Night. Come share your culture and help make it a success!'),

  (3,  'Service opportunities this week',
       'Multiple service opportunities available this week at the food bank, animal shelter, and local schools. Sign up on our website.'),

  (8,  'MCAT prep resources updated',
       'We''ve updated our shared study drive with new MCAT prep materials including Anki decks and practice passages.'),

  (9,  'Pitch competition judges announced',
       'We''re thrilled to announce our panel of judges for next week''s startup pitch competition, including founders of two Utah unicorns!'),

  (10, 'Trail conditions report',
       'Y Mountain trail is in great condition. The slot canyon trail is still closed due to flooding. Check our website for weekly updates.'),

  (7,  'Showcase tryouts this Friday',
       'Want to perform in our spring showcase? Tryouts are this Friday at 7pm. All styles and levels are encouraged to audition.'),

  (4,  'Stock market sim results',
       'Congratulations to team ''Bull Market'' for winning our fall stock simulation with a 47% return! Spring competition starts soon.'),

  (11, 'Kitchen equipment update',
       'We just received a new set of carbon steel woks and high-BTU burners. Get ready for serious Asian cooking classes!');


-- =============================================================================
-- Done. Summary:
--   10 buildings, 10 categories, 12 clubs, 40 events, 10 announcements
-- =============================================================================
