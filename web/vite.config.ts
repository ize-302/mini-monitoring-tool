import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API = "localhost:2697";

// https://vite.dev/config/
export default defineConfig({
  base: "/web/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": `http://${API}`,
      "/ws": { target: `ws://${API}`, ws: true },
    },
  },
});
