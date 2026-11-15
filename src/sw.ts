/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { abrirBaseDeDatos } from "./db";
import { descargarPendientes, ETIQUETA_SYNC } from "./descargas";

declare const self: ServiceWorkerGlobalScope;
interface SyncEvent extends ExtendableEvent { readonly tag: string; readonly lastChance: boolean; }
self.skipWaiting(); clientsClaim(); cleanupOutdatedCaches(); precacheAndRoute(self.__WB_MANIFEST);
registerRoute(({ url }) => url.pathname.startsWith("/iconos/"), new CacheFirst({ cacheName: "imagenes", plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 2592000 })] }));
registerRoute(({ url }) => url.pathname.startsWith("/api/"), new NetworkFirst({ cacheName: "api-atlas3d" }));
registerRoute(({ url }) => url.pathname.startsWith("/modelos/"), async ({ request }) => (await caches.match(request, { cacheName: "modelos-3d" })) ?? fetch(request));
async function avisar(mensaje: unknown): Promise<readonly WindowClient[]> {
  const ventanas = await self.clients.matchAll({ type: "window" }); ventanas.forEach((ventana) => ventana.postMessage(mensaje)); return ventanas;
}
self.addEventListener("sync", (event) => {
  const sync = event as SyncEvent; if (sync.tag !== ETIQUETA_SYNC) return;
  sync.waitUntil((async () => {
    const db = await abrirBaseDeDatos();
    try {
      const cantidad = await descargarPendientes(db, async (hechos, total) => { await avisar({ tipo: "progreso", hechos, total }); });
      if (!cantidad) return;
      const ventanas = await avisar({ tipo: "descarga-completa" });
      if (!ventanas.some((ventana) => ventana.visibilityState === "visible")) await self.registration.showNotification("Modelos listos", { body: "Las fichas ya están disponibles sin conexión.", icon: "/iconos/icon-192.png", tag: "atlas-descarga", data: { url: "/" } });
    } catch (error) {
      if (sync.lastChance) await self.registration.showNotification("No se pudo completar la descarga", { body: "Abre el Atlas con conexión y vuelve a intentarlo.", icon: "/iconos/icon-192.png", tag: "atlas-descarga", data: { url: "/" } });
      throw error;
    } finally { db.close(); }
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); event.waitUntil((async () => {
    const destino = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const abierta = ventanas.find((ventana) => new URL(ventana.url).origin === self.location.origin);
    return abierta ? abierta.focus() : self.clients.openWindow(destino);
  })());
});
