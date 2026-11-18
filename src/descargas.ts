import { obtenerDescargas, marcarDescargaLista } from "./db";
import type { Ficha } from "./modelos/tipos";
import { BASE_URL } from "./base";

export const ETIQUETA_SYNC = "descargar-modelos";
export const CACHE_MODELOS = "modelos-3d";

export const urlDeModelo = (id: string) => `${BASE_URL}modelos/${id}.json`;

export type AlProgresar = (
  hechos: number,
  total: number,
) => void | Promise<void>;

export async function descargarPendientes(
  db: IDBDatabase,
  alProgresar: AlProgresar,
): Promise<number> {
  const todas = await obtenerDescargas(db);
  const total = todas.length;
  let hechos = todas.filter((d) => d.estado === "listo").length;
  const cache = await caches.open(CACHE_MODELOS);
  let descargadas = 0;
  for (const d of todas.filter((x) => x.estado === "pendiente")) {
    const resp = await fetch(urlDeModelo(d.modeloId), { cache: "reload" });
    if (!resp.ok)
      throw new Error(`${d.modeloId}: el servidor respondió ${resp.status}`);
    await cache.put(urlDeModelo(d.modeloId), resp);
    await marcarDescargaLista(db, d.modeloId);
    hechos++;
    descargadas++;
    await alProgresar(hechos, total);
  }
  return descargadas;
}

export async function leerFicha(id: string): Promise<Ficha | null> {
  try {
    const cache = await caches.open(CACHE_MODELOS);
    const guardada = await cache.match(urlDeModelo(id));
    if (guardada) return (await guardada.json()) as Ficha;
  } catch {}
  try {
    const resp = await fetch(urlDeModelo(id));
    if (resp.ok) return (await resp.json()) as Ficha;
  } catch {}
  return null;
}
