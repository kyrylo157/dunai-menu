-- section: kitchen | bar; layout: cards (photo grid) | list (rows with dotted leaders)
CREATE TABLE categories (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,
  section TEXT    NOT NULL DEFAULT 'kitchen',
  layout  TEXT    NOT NULL DEFAULT 'cards',
  sort    INTEGER NOT NULL DEFAULT 0,
  hidden  INTEGER NOT NULL DEFAULT 0
);

-- photo: R2 key ("p/<uuid>.jpg") or an external URL that has not been imported yet
CREATE TABLE items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  price       REAL    NOT NULL DEFAULT 0,
  weight      TEXT,
  description TEXT,
  photo       TEXT,
  badge       TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX items_category ON items(category_id, sort);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE admins (
  chat_id INTEGER PRIMARY KEY,
  name    TEXT,
  added   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- per-chat bot state while waiting for the owner's next message
CREATE TABLE sessions (
  chat_id INTEGER PRIMARY KEY,
  data    TEXT NOT NULL
);
