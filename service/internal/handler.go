package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Metric struct {
	ID     int     `json:"id"`
	Metric string  `json:"metric"`
	Value  float64 `json:"value"`
	Ts     int64   `json:"ts"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Handler struct {
	db      *sql.DB
	mu      sync.Mutex
	clients map[*websocket.Conn]struct{}
}

func NewHander(db *sql.DB) *Handler {
	return &Handler{db: db, clients: make(map[*websocket.Conn]struct{})}
}

func (h *Handler) HistoryHandler(w http.ResponseWriter, r *http.Request) {
	metricType := r.URL.Query().Get("metric")
	var rows *sql.Rows
	var err error

	if metricType != "" {
		rows, err = h.db.Query("SELECT id, metric, value, ts FROM metrics WHERE metric = ? ORDER BY ts DESC LIMIT 200", metricType)
	} else {
		rows, err = h.db.Query("SELECT id, metric, value, ts FROM metrics ORDER BY ts DESC LIMIT 200")
	}

	if err != nil {
		log.Println("query history:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var metrics []Metric
	for rows.Next() {
		var metric Metric
		if err := rows.Scan(&metric.ID, &metric.Metric, &metric.Value, &metric.Ts); err != nil {
			log.Println("scan history row:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		metrics = append(metrics, metric)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(metrics)
}

func (h *Handler) MetricHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	metric := vars["metric"] // metric values: cpu, memory, temperature, battery
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	value, err := strconv.Atoi(strings.TrimSpace(string(body)))
	if err != nil {
		http.Error(w, "Value must be an integer", http.StatusBadRequest)
		return
	}

	var metricData Metric
	err = h.db.QueryRow(`INSERT INTO metrics (metric, value, ts) VALUES (?, ?, ?) RETURNING id, metric, value, ts`, metric, value, time.Now().UnixMilli()).
		Scan(&metricData.ID, &metricData.Metric, &metricData.Value, &metricData.Ts)
	if err != nil {
		log.Println("insert metric:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	h.Broadcast(metricData)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(metricData)
}

// sends message to every connected client, dropping any that fails
func (h *Handler) Broadcast(message Metric) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for conn := range h.clients {
		conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := conn.WriteJSON(message); err != nil {
			log.Printf("broadcast to %s failed: %v", conn.RemoteAddr(), err)
			conn.Close()
			delete(h.clients, conn)
		}
	}
}

func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error upgrading connection:", err)
		return
	}

	h.mu.Lock()
	h.clients[conn] = struct{}{}
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients, conn)
		h.mu.Unlock()
		conn.Close()
	}()

	log.Printf("Client connected: %s", conn.RemoteAddr())

	// detects disconnects;
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure) {
				log.Printf("Unexpected close error: %v", err)
			}
			break
		}
	}

	log.Printf("Client disconnected: %s", conn.RemoteAddr())
}
