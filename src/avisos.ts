                                                               
                                                                           
                                                                               

import { BASE_URL } from "./base";

export type EstadoAvisos = NotificationPermission | "no-soportado";

export function estadoAvisos(): EstadoAvisos {
  return "Notification" in window ? Notification.permission : "no-soportado";
}

export async function pedirPermisoAvisos(): Promise<EstadoAvisos> {
  if (!("Notification" in window)) return "no-soportado";
  return Notification.requestPermission();
}

                                                                                          
export async function mostrarAviso(titulo: string, cuerpo: string, url = BASE_URL, tag = "atlas-aviso"): Promise<boolean> {
  if (estadoAvisos() !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(titulo, {
    body: cuerpo,
    icon: `${BASE_URL}iconos/icon-192.png`,
    tag,
    data: { url },
  });
  return true;
}
