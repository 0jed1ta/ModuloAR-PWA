                                                                                                      
                                                                        
                                                                                               
                                                                                               
                                                                                          
import { spawnSync } from "node:child_process";

const argumentos = process.argv.slice(2);                         
function ejecutar(orden, args) {
  const r = spawnSync(orden, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
ejecutar("npx", ["ng", "build", ...argumentos]);
ejecutar("npx", ["tsc", "-p", "tsconfig.sw.json"]);
ejecutar("node", ["scripts/build-sw.mjs"]);
