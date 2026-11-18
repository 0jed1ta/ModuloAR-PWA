export type SoporteAR =
  | "disponible"
  | "contexto-inseguro"
  | "sin-webxr"
  | "sin-ar";

export async function diagnosticarAR(): Promise<{
  estado: SoporteAR;
  lineas: string[];
}> {
  const lineas: string[] = [];
  const seguro = window.isSecureContext;
  lineas.push(`Contexto seguro (HTTPS o localhost): ${seguro ? "sí" : "NO"}`);
  if (!seguro) return { estado: "contexto-inseguro", lineas };

  lineas.push(`navigator.xr: ${navigator.xr ? "presente" : "AUSENTE"}`);
  if (!navigator.xr) return { estado: "sin-webxr", lineas };

  try {
    const ok = await navigator.xr.isSessionSupported("immersive-ar");
    lineas.push(`isSessionSupported("immersive-ar"): ${ok}`);
    return { estado: ok ? "disponible" : "sin-ar", lineas };
  } catch (err) {
    lineas.push(
      `isSessionSupported("immersive-ar") lanzó: ${err instanceof Error ? err.name : String(err)}`,
    );
    return { estado: "sin-ar", lineas };
  }
}

export async function detectarSoporteAR(): Promise<SoporteAR> {
  return (await diagnosticarAR()).estado;
}

export function mensajeSoporteAR(estado: SoporteAR): string {
  switch (estado) {
    case "disponible":
      return "Este dispositivo puede abrir una sesión de realidad aumentada.";
    case "contexto-inseguro":
      return "La realidad aumentada exige HTTPS o localhost.";
    case "sin-webxr":
      return "Este navegador no ofrece WebXR (por ejemplo, Safari en iPhone o Firefox). El visor 3D sigue funcionando.";
    case "sin-ar":
      return "Este dispositivo no admite realidad aumentada en el navegador (por ejemplo, un computador de escritorio sin el emulador activado).";
  }
}

export async function pedirSesionAR(
  overlay: HTMLElement | null,
): Promise<XRSession> {
  const abrir = (requeridas: string[], opcionales: string[]) => {
    const opciones: XRSessionInit & { domOverlay?: { root: Element } } = {
      requiredFeatures: requeridas,
      optionalFeatures: opcionales,
    };
    if (overlay) opciones.domOverlay = { root: overlay };
    return navigator.xr!.requestSession("immersive-ar", opciones);
  };
  try {
    return await abrir(["local", "hit-test"], ["dom-overlay", "anchors"]);
  } catch (error) {
    if ((error as DOMException).name !== "NotSupportedError") throw error;
    return abrir(["local"], ["dom-overlay", "hit-test", "anchors"]);
  }
}

export interface CapacidadesAR {
  overlay: boolean;
  hitTest: boolean;
  anclas: boolean;
}

export function capacidadesDe(sesion: XRSession): CapacidadesAR {
  const concedidas = (sesion as XRSession & { enabledFeatures?: string[] })
    .enabledFeatures;
  const tiene = (nombre: string, respaldo: boolean) =>
    Array.isArray(concedidas) ? concedidas.includes(nombre) : respaldo;
  return {
    overlay: Boolean(sesion.domOverlayState),
    hitTest: tiene(
      "hit-test",
      typeof sesion.requestHitTestSource === "function",
    ),
    anclas: tiene(
      "anchors",
      typeof XRFrame !== "undefined" && "createAnchor" in XRFrame.prototype,
    ),
  };
}

export function describirErrorAR(err: unknown): string {
  const nombre = err instanceof Error ? err.name : "";
  switch (nombre) {
    case "NotSupportedError":
      return "Este dispositivo no puede abrir realidad aumentada con las funciones que pide la app.";
    case "SecurityError":
      return "El navegador rechazó la sesión de realidad aumentada: se denegó el permiso o la petición no vino de un toque del usuario.";
    default:
      return "No se pudo iniciar la realidad aumentada. Inténtalo de nuevo.";
  }
}
