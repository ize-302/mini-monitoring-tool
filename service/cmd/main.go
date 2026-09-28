package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/ize-302/mini-monitoring-tool/server-go/internal"
	"github.com/ize-302/mini-monitoring-tool/server-go/internal/database"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// db connection
	db, err := database.DBConn()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()
	fmt.Println("Successfully connected!")

	h := &database.Config{DB: db}
	if err = h.Migrate(); err != nil {
		log.Fatalf("migrate database: %v", err)
	}
	fmt.Println("successfully migrated database")

	// api routes
	r := mux.NewRouter()
	r.PathPrefix("/web").Handler(http.StripPrefix("/web", http.FileServer(http.Dir("../web/dist/"))))

	handler := internal.NewHander(db)
	r.HandleFunc("/api/history", handler.HistoryHandler).Methods("GET")
	r.HandleFunc("/api/metrics/{metric}", handler.MetricHandler).Methods("POST")
	r.HandleFunc("/ws", handler.HandleWebSocket)

	port := ":2697"

	srv := &http.Server{
		Handler: r,
		Addr:    port,
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	fmt.Printf("Server listening on port %s...\n", port)

	err = srv.ListenAndServe()
	if err != nil {
		log.Fatalf("Server failed to listen on port %s - %v\n", port, err)
	}
}
