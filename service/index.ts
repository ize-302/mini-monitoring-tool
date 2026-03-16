import web from "../web/index.html";
import { db } from "./db";

const clients = new Set<WebSocket>();

function broadcast(data: { metric: string; value: number; ts: number }) {
  const payload = JSON.stringify(data);
  for (const ws of clients) {
    ws.send(payload);
  }
}

function insertDataIntoDB(
  type: "cpu" | "memory" | "temperature",
  value: number,
) {
  const insertMetric = db.prepare(`
          INSERT INTO metrics (metric, value, ts)
          VALUES (?, ?, ?)
        `);
  insertMetric.run(type, value, Date.now());
}

export default {
  port: 2697,
  routes: {
    "/web": web,
    "/api/history": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const metric = url.searchParams.get("metric");
        const getHistory = db.prepare(`
          SELECT value, ts
          FROM metrics
          WHERE metric = ?
          ORDER BY ts DESC
          LIMIT 200
        `);
        const rows = getHistory.all(metric);
        return Response.json(rows);
      },
    },
    "/api/metrics/cpu": {
      POST: async (req: Request) => {
        const body = await req.json();
        const body_p = JSON.parse(JSON.stringify(body));
        insertDataIntoDB("cpu", body_p[0]);
        broadcast({
          metric: "cpu",
          value: body_p[0],
          ts: Date.now(),
        });
        return Response.json({ created: true, body });
      },
    },
    "/api/metrics/memory": {
      POST: async (req: Request) => {
        const body = await req.json();
        const body_p = JSON.parse(JSON.stringify(body));
        insertDataIntoDB("memory", body_p[0]);
        broadcast({
          metric: "memory",
          value: body_p[0],
          ts: Date.now(),
        });
        return Response.json({ created: true, body });
      },
    },
    "/api/metrics/temperature": {
      POST: async (req: Request) => {
        const body = await req.json();
        const body_p = JSON.parse(JSON.stringify(body));
        insertDataIntoDB("temperature", body_p[0]);
        broadcast({
          metric: "temperature",
          value: body_p[0],
          ts: Date.now(),
        });
        return Response.json({ created: true, body });
      },
    },
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },
  fetch(req: Request, server: Bun.Server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined;
      }
      return new Response("upgrade to websocket failed", { status: 400 });
    }
    return new Response("Websocket server running");
  },
  websocket: {
    open(ws: Bun.ServerWebSocket<unknown>) {
      console.log("WebSocket connection opened");
      clients.add(ws as unknown as WebSocket);
    },
    message(_ws: Bun.ServerWebSocket<unknown>, _msg: string | Buffer) {},
    close(ws: Bun.ServerWebSocket<unknown>) {
      clients.delete(ws as unknown as WebSocket);
    },
  },
};

console.log(`🚀 Web server running at 2697`);
