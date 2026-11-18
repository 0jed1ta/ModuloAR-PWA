import { BASE_URL } from "./base";

export function hayConexion(): boolean {
  return navigator.onLine;
}

export type EstadoRedReal = "llega" | "no-llega" | "no-hay-red";

export async function comprobarRed(limiteMs = 4000): Promise<EstadoRedReal> {
  if (!navigator.onLine) return "no-hay-red";
  const controlador = new AbortController();
  const temporizador = window.setTimeout(() => controlador.abort(), limiteMs);
  try {
    const respuesta = await fetch(
      `${BASE_URL}modelos/mvc.json?comprobar=${Date.now()}`,
      {
        cache: "no-store",
        signal: controlador.signal,
      },
    );
    return respuesta.ok ? "llega" : "no-llega";
  } catch {
    return "no-llega";
  } finally {
    window.clearTimeout(temporizador);
  }
}

export function iniciarConexion(
  alCambiar: (enLinea: boolean) => void,
): () => void {
  const alSubir = () => alCambiar(true);
  const alBajar = () => alCambiar(false);
  window.addEventListener("online", alSubir);
  window.addEventListener("offline", alBajar);
  alCambiar(navigator.onLine);
  return () => {
    window.removeEventListener("online", alSubir);
    window.removeEventListener("offline", alBajar);
  };
}
