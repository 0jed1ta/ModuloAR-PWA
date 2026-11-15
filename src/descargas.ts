import { obtenerDescargas, marcarDescargaLista } from "./db";

export const ETIQUETA_SYNC = "descargar-modelos";
export const CACHE_MODELOS = "modelos-3d";
const BASE_URL = ((import.meta as ImportMeta & { env?: { BASE_URL: string } }).env?.BASE_URL ?? "/");
export const urlDeModelo = (id: string) => `${BASE_URL}modelos/${id}.json`;
export type AlProgresar = (hechos: number, total: number) => void | Promise<void>;

export async function descargarPendientes(db: IDBDatabase, alProgresar: AlProgresar): Promise<number> {
  const todas = await obtenerDescargas(db);
  const total = todas.length;
  let hechos = todas.filter((descarga) => descarga.estado === "listo").length;
  const cache = await caches.open(CACHE_MODELOS);
  let descargadas = 0;
  for (const descarga of todas.filter((item) => item.estado === "pendiente")) {
    const respuesta = await fetch(urlDeModelo(descarga.modeloId), { cache: "reload" });
    if (!respuesta.ok) throw new Error(`${descarga.modeloId}: el servidor respondió ${respuesta.status}`);
    await cache.put(urlDeModelo(descarga.modeloId), respuesta);
    await marcarDescargaLista(db, descarga.modeloId);
    hechos += 1;
    descargadas += 1;
    await alProgresar(hechos, total);
  }
  return descargadas;
}
