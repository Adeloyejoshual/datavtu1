import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  // React entry is src/page/main.jsx
  root: path.resolve(__dirname),

  build: {
    // Build output goes into public/
    outDir: path.resolve(__dirname, "public"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          ui: ["lucide-react", "clsx"],
          store: ["zustand"],
        },
      },
    },
  },

  server: {
    port: 5173,
    // Proxy all /api calls to Express during development
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/page"),
      "@components": path.resolve(__dirname, "src/page/components"),
      "@pages": path.resolve(__dirname, "src/page"),
      "@api": path.resolve(__dirname, "src/page/api"),
      "@store": path.resolve(__dirname, "src/page/store"),
      "@utils": path.resolve(__dirname, "src/page/utils"),
    },
  },
});