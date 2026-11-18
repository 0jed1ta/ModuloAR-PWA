import playwright from "../../checkpoints/checklist-atlas/node_modules/playwright/index.js";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const { chromium } = playwright;
const destino = fileURLToPath(
  new URL("../../evidencias/capturas/", import.meta.url),
);
await mkdir(destino, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "dark",
});
const page = await context.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message));
await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await page.locator("#visor canvas").waitFor();
await page.screenshot({
  path: `${destino}/proyecto-final-inicio.png`,
  fullPage: true,
});
await page
  .locator("section[zonadescargas]")
  .screenshot({ path: `${destino}/sesion-37-descargas-avisos.png` });
await page
  .locator("section[zonavisor]")
  .screenshot({ path: `${destino}/sesion-38-diagnostico-webxr.png` });
await page
  .locator("div[catalogo]")
  .screenshot({ path: `${destino}/sesion-43-catalogo-componentes.png` });

await page.locator("#btn-modelo-hexagonal").click();
await page.waitForTimeout(500);
await page
  .locator("section[panelmodelo]")
  .screenshot({ path: `${destino}/sesion-40-modelo-hexagonal.png` });

const tarjeta = page.locator("#tarjeta-hexagonal");
await tarjeta.locator(".btn-visitar").click();
await tarjeta.locator(".btn-visitar").click();
await page.waitForTimeout(300);
await tarjeta.screenshot({ path: `${destino}/sesion-44-contador-visitas.png` });

await page.evaluate(() => {
  const e = new Event("beforeinstallprompt", { cancelable: true });
  e.prompt = async () => {};
  e.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });
  window.dispatchEvent(e);
});
await page.waitForTimeout(150);
await page
  .locator("section[zonainstalar]")
  .screenshot({ path: `${destino}/sesion-41-instalacion-ofrecida.png` });
await page.locator("#btn-ahora-no").click();
await page.waitForTimeout(150);
await page
  .locator("section[zonainstalar]")
  .screenshot({ path: `${destino}/sesion-41-instalacion-pospuesta.png` });

await page.locator("#btn-camara").click();
await page.waitForTimeout(800);
await page
  .locator("section[zonavisor]")
  .screenshot({ path: `${destino}/sesion-36-camara-activa.png` });
await page.locator("#btn-camara").click();

await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("#visor canvas").waitFor();
await page.screenshot({
  path: `${destino}/sesion-34-app-offline.png`,
  fullPage: true,
});
await context.setOffline(false);

await browser.close();
console.log(`Capturas guardadas en ${destino}`);
