-- photos live in D1 instead of R2 (R2 needs a card on the Cloudflare account; D1 has 5 GB free)
CREATE TABLE photos (
  key  TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data BLOB NOT NULL
);
