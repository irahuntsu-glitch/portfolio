import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// BASE_PATH is set by the GitHub Actions workflow:
//   user.github.io repo  -> "/"
//   any other repo       -> "/<repo>/"
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: { port: 5177, host: "127.0.0.1" },
  build: { assetsInlineLimit: 0 },
})
