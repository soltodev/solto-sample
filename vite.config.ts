import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/solto-sample/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
