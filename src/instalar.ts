interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type EstadoInstalacion =
  | "instalada"
  | "recien-instalada"
  | "instalable"
  | "ios"
  | "no-disponible";

let evento: EventoInstalacion | null = null;
let rechazada = false;
let recienInstalada = false;
let avisar: () => void = () => {};
const CLAVE_POSPONER = "atlas3d-instalar-pospuesta-hasta";
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

export function instalacionPospuesta(): boolean {
  const hasta = Number(localStorage.getItem(CLAVE_POSPONER) || 0);
  if (hasta > Date.now()) return true;
  if (hasta) localStorage.removeItem(CLAVE_POSPONER);
  return false;
}

export function posponerInstalacion(): void {
  localStorage.setItem(CLAVE_POSPONER, String(Date.now() + SIETE_DIAS));
  avisar();
}

export function estaInstalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function esIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

export function estadoInstalacion(): EstadoInstalacion {
  if (estaInstalada()) return "instalada";
  if (recienInstalada) return "recien-instalada";
  if (evento && !instalacionPospuesta()) return "instalable";
  if (esIOS()) return "ios";
  return "no-disponible";
}

export function instalacionRechazada(): boolean {
  return rechazada;
}

export function iniciarInstalacion(alCambiar: () => void): () => void {
  avisar = alCambiar;
  const alOfrecer = (e: Event) => {
    e.preventDefault();
    evento = e as EventoInstalacion;
    rechazada = false;
    avisar();
  };
  const alInstalar = () => {
    evento = null;
    recienInstalada = true;
    avisar();
  };

  const modo = window.matchMedia("(display-mode: standalone)");
  const alCambiarModo = () => avisar();
  window.addEventListener("beforeinstallprompt", alOfrecer);
  window.addEventListener("appinstalled", alInstalar);
  modo.addEventListener("change", alCambiarModo);
  avisar();

  return () => {
    window.removeEventListener("beforeinstallprompt", alOfrecer);
    window.removeEventListener("appinstalled", alInstalar);
    modo.removeEventListener("change", alCambiarModo);
    avisar = () => {};
  };
}

export async function pedirInstalacion(): Promise<
  "accepted" | "dismissed" | "no-disponible"
> {
  if (!evento) return "no-disponible";
  const guardado = evento;
  evento = null;
  await guardado.prompt();
  const { outcome } = await guardado.userChoice;
  rechazada = outcome === "dismissed";
  avisar();
  return outcome;
}
