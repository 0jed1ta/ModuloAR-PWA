
export function hayConexion(): boolean {
  return navigator.onLine;
}

/** Llama a «alCambiar» al arrancar y cada vez que cambie. Devuelve cómo dejar de escuchar. */
export function iniciarConexion(alCambiar: (enLinea: boolean) => void): () => void {
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
