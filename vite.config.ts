import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"] },
      },
    },
  },
  plugins: [
    VitePWA({
      manifest: false,
      registerType: "autoUpdate",
      injectRegister: false, // registramos nosotros mismos en main.ts, con virtual:pwa-register

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
