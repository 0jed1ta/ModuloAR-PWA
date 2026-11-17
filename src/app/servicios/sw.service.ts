                                                                                                           
                                                                                        
                                                                                                           
                                                                                                  
import { Injectable, isDevMode, signal } from "@angular/core";
import { Workbox } from "workbox-window";
import { BASE_URL } from "../../base";
import { mostrarAviso } from "../../avisos";

@Injectable({ providedIn: "root" })
export class SwService {
  readonly offlineReady = signal(false);

  iniciar(): void {
                                                                                     
    if (isDevMode() || !("serviceWorker" in navigator)) return;
    const wb = new Workbox(`${BASE_URL}sw.js`, { scope: BASE_URL });
    // Primera instalación: el precaché quedó completo.
    wb.addEventListener("activated", (e) => {
      if (e.isUpdate) return;
      this.offlineReady.set(true);
      // El usuario está mirando la pantalla: la notificación solo si NO la está mirando.
      if (document.visibilityState !== "visible") {
        void mostrarAviso("Atlas 3D listo", "Ya funciona sin conexión.", BASE_URL, "atlas-offline");
      }
    });
    // Versión nueva (autoUpdate): cuando toma el control, se recarga para usarla.
    wb.addEventListener("controlling", (e) => {
      if (e.isUpdate) window.location.reload();
    });
    wb.register().catch((error) => console.error("Error al registrar el SW de Workbox:", error));
  }
}
