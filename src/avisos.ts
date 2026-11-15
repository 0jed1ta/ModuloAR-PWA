export type EstadoAvisos = NotificationPermission | "no-soportado";

export function estadoAvisos(): EstadoAvisos {
  return "Notification" in window ? Notification.permission : "no-soportado";
}

export async function pedirPermisoAvisos(): Promise<EstadoAvisos> {
  if (!("Notification" in window)) return "no-soportado";
  return Notification.requestPermission();
}

export async function mostrarAviso(titulo: string, cuerpo: string, url = "/", tag = "atlas-aviso"): Promise<boolean> {
  if (estadoAvisos() !== "granted") return false;
  const registro = await navigator.serviceWorker.ready;
  const base = import.meta.env.BASE_URL;
  await registro.showNotification(titulo, { body: cuerpo, icon: `${base}iconos/icon-192.png`, tag, data: { url } });
  return true;
}
