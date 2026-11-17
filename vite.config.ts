import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/build/")) return "three";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
        },
      },
    },
  },
  plugins: [
    react(), // Sesión 43: JSX y recarga rápida en desarrollo
    VitePWA({
      manifest: false,
      registerType: "autoUpdate",
      injectRegister: false, // lo registra React con useRegisterSW (virtual:pwa-register/react)

      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{html,js,css,png,json}"],
        globIgnores: ["modelos/**"],
      },
    }),
  ],
});
