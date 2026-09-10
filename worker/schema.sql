-- D1 "me" — полная схема (справочно; таблицы уже созданы в проде).
CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, first_name TEXT, created_at INTEGER, mailboxes TEXT, last_seen INTEGER);

CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at INTEGER NOT NULL, source TEXT, status TEXT, data TEXT);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS meds (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, name TEXT, dosage TEXT, times TEXT, start_date TEXT, end_date TEXT, active INTEGER DEFAULT 1, created_at INTEGER, tz_offset INTEGER DEFAULT 180, stages TEXT, purpose TEXT);
CREATE TABLE IF NOT EXISTS med_log (med_id TEXT, slot TEXT, sent_date TEXT);

CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT, due_date TEXT, lead_days INTEGER DEFAULT 7, text TEXT, sent INTEGER DEFAULT 0, tz_offset INTEGER DEFAULT 180, created_at INTEGER);

CREATE TABLE IF NOT EXISTS rl (user_id TEXT PRIMARY KEY, ts INTEGER, n INTEGER);

CREATE TABLE IF NOT EXISTS inbox (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, mime TEXT, name TEXT, b64 TEXT NOT NULL, status TEXT DEFAULT 'pending');
CREATE INDEX IF NOT EXISTS idx_inbox_user ON inbox (user_id, status, created_at);

CREATE TABLE IF NOT EXISTS mailkey (user_id TEXT PRIMARY KEY, token TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_mailkey_token ON mailkey (token);
CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT, body TEXT, payload TEXT, status TEXT DEFAULT 'pending', created_at INTEGER NOT NULL, decided_at INTEGER, user_id TEXT, msg_id INTEGER);
CREATE INDEX IF NOT EXISTS queue_status ON queue (status, created_at);
