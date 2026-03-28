CREATE TABLE IF NOT EXISTS companies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    address     TEXT,
    phone       TEXT,
    email       TEXT,
    contact_person TEXT,
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    designation TEXT,
    phone       TEXT,
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
);

ALTER TABLE purchases ADD COLUMN company_id INTEGER REFERENCES companies(id);
ALTER TABLE purchases ADD COLUMN employee_id INTEGER REFERENCES employees(id);

ALTER TABLE payments ADD COLUMN company_id INTEGER REFERENCES companies(id);
ALTER TABLE payments ADD COLUMN employee_id INTEGER REFERENCES employees(id);
