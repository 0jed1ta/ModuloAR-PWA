import { useEffect, useState } from "react";
import { encolarDescargas } from "../db";
import { ETIQUETA_SYNC, descargarPendientes } from "../descargas";
import { estadoAvisos, mostrarAviso, pedirPermisoAvisos } from "../avisos";

interface Props {
  ids: string[];
  dbPromesa: Promise<IDBDatabase>;
  alCambiarDescargas: () => Promise<void>;
  appLista: boolean;
}

export function ZonaDescargas({ ids, dbPromesa, alCambiarDescargas, appLista }: Props) {
  const [permiso, setPermiso] = useState(estadoAvisos());
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const pintarProgreso = (hechos: number, total: number) => {
    setProgreso({ hechos, total });
    setMensaje(hechos >= total ? `✓ ${hechos} de ${total} fichas guardadas: ya puedes consultarlas sin conexión.` : `Descargando… ${hechos} de ${total} fichas.`);
  };

  useEffect(() => {
    if (appLista) setMensaje("✓ La app ya funciona sin conexión.");
  }, [appLista]);

  useEffect(() => {
    const alMensaje = async (e: MessageEvent) => {
      if (e.data?.tipo === "progreso") pintarProgreso(e.data.hechos, e.data.total);
      if (e.data?.tipo === "descarga-completa") await alCambiarDescargas();
    };
    navigator.serviceWorker?.addEventListener("message", alMensaje);
    return () => navigator.serviceWorker?.removeEventListener("message", alMensaje);
  }, [alCambiarDescargas]);

  async function activarAvisos() {
    const nuevo = await pedirPermisoAvisos();
    if (nuevo === "granted") await mostrarAviso("Avisos activados", "Te avisaremos cuando las fichas estén listas.");
    setPermiso(estadoAvisos());
  }

  async function descargar() {
    const db = await dbPromesa;
    await encolarDescargas(db, ids);
    pintarProgreso(0, ids.length);
    setOcupado(true);
    try {
      let enSegundoPlano = false;
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(ETIQUETA_SYNC);
          enSegundoPlano = true;
          setMensaje("Descarga solicitada: el navegador la completará en cuanto haya conexión.");
        } catch {
          enSegundoPlano = false;
        }
      }
      if (!enSegundoPlano) {
        await descargarPendientes(db, pintarProgreso);
        await alCambiarDescargas();
      }
    } catch (err) {
      setMensaje("No se pudo completar la descarga: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setOcupado(false);
    }
  }

  const textoAvisos =
    permiso === "granted" ? "Avisos activos."
    : permiso === "denied" ? "Avisos bloqueados (cámbialo en la configuración del sitio)."
    : permiso === "no-soportado" ? "Este navegador no soporta notificaciones."
    : "Avisos sin activar.";

  return (
    <section className="descargas-zona" aria-labelledby="titulo-descargas">
      <h2 id="titulo-descargas">Uso sin conexión</h2>
      <div className="descargas-barra">
        <button type="button" id="btn-avisos" disabled={permiso !== "default"} onClick={activarAvisos}>🔔 Activar avisos</button>
        <button type="button" id="btn-descargar" disabled={ocupado} onClick={descargar}>⬇ Descargar fichas para usar sin conexión</button>
        <span id="estado-avisos" className="estado-avisos">{textoAvisos}</span>
      </div>
      <progress id="progreso-descarga" max={progreso?.total ?? 3} value={progreso?.hechos ?? 0} hidden={progreso === null} />
      <p id="estado-descarga" className="estado-descarga" role="status">{mensaje}</p>
    </section>
  );
}
