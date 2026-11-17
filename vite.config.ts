import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/build/")) return "three";
          if (/node_modules\/(react|react-dom|scheduler)\                            
        },
      },
    },
  },
  plugins: [
    react(),                                                 
    VitePWA({
      manifest: false,
      registerType: "autoUpdate",
      injectRegister: false,                                                                    

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
