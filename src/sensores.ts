export type EstadoPermiso =
  | "granted"
  | "denied"
  | "no-necesario"
  | "no-soportado";

type EventoConPermiso = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export async function pedirPermisoOrientacion(): Promise<EstadoPermiso> {
  if (!("DeviceOrientationEvent" in window)) return "no-soportado";
  const Evento = DeviceOrientationEvent as EventoConPermiso;
  if (typeof Evento.requestPermission === "function") {
    try {
      return await Evento.requestPermission();
    } catch {
      return "denied";
    }
  }
  return "no-necesario";
}

export function hayOrientacionReal(timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const alRecibir = (e: DeviceOrientationEvent) => {
      if (e.beta !== null) {
        limpiar();
        resolve(true);
      }
    };
    const limpiar = () => {
      window.removeEventListener("deviceorientation", alRecibir);
      clearTimeout(t);
    };
    const t = setTimeout(() => {
      limpiar();
      resolve(false);
    }, timeoutMs);
    window.addEventListener("deviceorientation", alRecibir);
  });
}

export interface ControlOrientacion {
  calibrar(): void;
  detener(): void;
}

const GRADOS_A_RAD = Math.PI / 180;
const limitar = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function iniciarControlOrientacion(
  onRotacion: (rotX: number, rotY: number) => void,
  intervaloMs = 33,
): ControlOrientacion {
  let referencia: { beta: number; gamma: number } | null = null;
  let ultimaLectura: { beta: number; gamma: number } | null = null;
  let ultimoAviso = 0;

  const manejador = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    ultimaLectura = { beta: e.beta, gamma: e.gamma };
    if (!referencia) referencia = { ...ultimaLectura };
    const ahora = performance.now();
    if (ahora - ultimoAviso < intervaloMs) return;
    ultimoAviso = ahora;

    const dBeta = limitar(e.beta - referencia.beta, -90, 90);
    const dGamma = limitar(e.gamma - referencia.gamma, -90, 90);
    onRotacion(dBeta * GRADOS_A_RAD, dGamma * GRADOS_A_RAD);
  };

  window.addEventListener("deviceorientation", manejador);
  return {
    calibrar() {
      referencia = ultimaLectura ? { ...ultimaLectura } : null;
      onRotacion(0, 0);
    },
    detener() {
      window.removeEventListener("deviceorientation", manejador);
    },
  };
}
