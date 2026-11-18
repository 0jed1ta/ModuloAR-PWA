import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";
import { abrirBaseDeDatos } from "./db";
import { descargarPendientes, ETIQUETA_SYNC } from "./descargas";
import { BASE_URL } from "./base";

declare const self: ServiceWorkerGlobalScope;

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const BASE = BASE_URL;

registerRoute(
  ({ url }) => url.pathname.startsWith(BASE + "iconos/"),
  new CacheFirst({
    cacheName: "imagenes",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) => url.pathname.startsWith(BASE + "api/"),
  new NetworkFirst({ cacheName: "api-atlas3d" }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith(BASE + "modelos/"),
  async ({ request }) => {
    const guardada = await caches.match(request, { cacheName: "modelos-3d" });
    return guardada ?? fetch(request);
  },
);

async function avisarALasVentanas(
  mensaje: unknown,
): Promise<readonly WindowClient[]> {
  const ventanas = await self.clients.matchAll({ type: "window" });
  ventanas.forEach((v) => v.postMessage(mensaje));
  return ventanas;
}

self.addEventListener("sync", (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag !== ETIQUETA_SYNC) return;
  syncEvent.waitUntil(
    (async () => {
      const db = await abrirBaseDeDatos();
      try {
        const n = await descargarPendientes(db, async (hechos, total) => {
          await avisarALasVentanas({ tipo: "progreso", hechos, total });
        });
        if (n === 0) return;
        const ventanas = await avisarALasVentanas({
          tipo: "descarga-completa",
        });

        if (!ventanas.some((v) => v.visibilityState === "visible")) {
          await self.registration.showNotification("Modelos listos", {
            body: "Las fichas ya están en tu dispositivo: puedes consultarlas sin conexión.",
            icon: `${BASE}iconos/icon-192.png`,
            tag: "atlas-descarga",
            data: { url: BASE },
          });
        }
      } catch (err) {
        if (syncEvent.lastChance) {
          await self.registration.showNotification(
            "No se pudo completar la descarga",
            {
              body: "Abre el Atlas con conexión y vuelve a pulsar «Descargar».",
              icon: `${BASE}iconos/icon-192.png`,
              tag: "atlas-descarga",
              data: { url: BASE },
            },
          );
        }
        throw err;
      } finally {
        db.close();
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(
    event.notification.data?.url ?? BASE,
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const abierta = ventanas.find(
        (v) => new URL(v.url).origin === self.location.origin,
      );
      if (abierta) return abierta.focus();
      return self.clients.openWindow(destino);
    })(),
  );
});
