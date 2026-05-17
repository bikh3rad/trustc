import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// VITE_GATEWAY_URL lets us switch the dev-proxy target between:
//   - native:           http://localhost:8080  (default)
//   - docker compose:   http://gateway:8080    (set in docker-compose.yml)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gateway = env.VITE_GATEWAY_URL || "http://localhost:8080";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Listen on all interfaces inside the container; Compose maps it to
      // 127.0.0.1:5173 on the host, so it's not reachable from the LAN.
      host: true,
      proxy: {
        "/v1":   { target: gateway, changeOrigin: true },
        "/api":  { target: gateway, changeOrigin: true },
        "/auth": { target: gateway, changeOrigin: true },
      },
    },
  };
});
