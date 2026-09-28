// Package database
package database

import (
	"database/sql"
)

type Config struct {
	DB *sql.DB
}

func DBConn() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", "./metrics.db")
	if err != nil {
		return nil, err
	}

	return db, nil
}
