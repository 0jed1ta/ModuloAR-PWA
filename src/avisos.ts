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
  await registro.showNotification(titulo, { body: cuerpo, icon: "/iconos/icon-192.png", tag, data: { url } });
  return true;
}
