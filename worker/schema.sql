CREATE TABLE IF NOT EXISTS analyses (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  source      TEXT,             -- 'upload' | 'email'
  status      TEXT,             -- 'done' | 'processing' | 'error'
  data        TEXT              -- JSON: результат распознавания Gemini
);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS users (
  user_id     INTEGER PRIMARY KEY,
  first_name  TEXT,
  created_at  INTEGER,
  mailboxes   TEXT              -- JSON: подключённые ящики (этап 3)
);
