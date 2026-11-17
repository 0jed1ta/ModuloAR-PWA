                                                                                                    
                                                                                               
                                                                                                       
                                                                                                          
import { build } from "esbuild";
import { injectManifest } from "workbox-build";
import { rmSync } from "node:fs";

const temporal = "dist/.sw-empaquetado.js";
await build({
  entryPoints: ["src/sw.ts"],
  outfile: temporal,
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
});

const { count, size, warnings } = await injectManifest({
  swSrc: temporal,
  swDest: "dist/sw.js",
  globDirectory: "dist",
  globPatterns: ["**/*.{html,js,css,png,json}"],
                                                                                                                  
                                                             
  globIgnores: ["modelos/**", "sw.js", ".sw-empaquetado.js"],
});
rmSync(temporal);
warnings.forEach((w) => console.warn(w));
console.log(`\nPWA · Service Worker propio\nprecache  ${count} entries (${(size / 1024).toFixed(2)} KiB)\n  dist/sw.js`);
