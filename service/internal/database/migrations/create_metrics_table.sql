
-- create db table
CREATE TABLE IF NOT EXISTS metrics (
	id integer PRIMARY KEY AUTOINCREMENT,
	metric TEXT NOT NULL,
	value REAL NOT NULL,
	ts integer NOT NULL
);

-- cleanup
DELETE FROM metrics
WHERE ts < strftime('%s','now','-1 days') * 1000

