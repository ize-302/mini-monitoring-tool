import { Database } from "bun:sqlite";

export const db = new Database("./metrics.db", { strict: true });

db.run(`
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
`);

// CREATE DB TABLE
db.run(`CREATE TABLE IF NOT EXISTS metrics (
	id integer PRIMARY KEY AUTOINCREMENT,
	metric TEXT NOT NULL,
	value REAL NOT NULL,
	ts integer NOT NULL)
`);

// CLEANUP METRICS
db.run(`
DELETE FROM metrics
WHERE ts < strftime('%s','now','-1 days') * 1000
`);
