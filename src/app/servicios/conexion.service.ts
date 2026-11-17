                                                                                            
                                                                                                
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { comprobarRed, iniciarConexion } from "../../conexion";

@Injectable({ providedIn: "root" })
export class ConexionService {
  readonly texto = signal<string | null>(null);

  constructor() {
    let estuvoSinConexion = false;
    let temporizador: number | undefined;
    const dejarDeEscuchar = iniciarConexion((enLinea) => {
      window.clearTimeout(temporizador);
      if (!enLinea) {
        estuvoSinConexion = true;
        this.texto.set("Sin conexión: los modelos y las fichas descargadas siguen disponibles.");
      } else if (estuvoSinConexion) {
        this.texto.set("Comprobando acceso al servidor…");
        void comprobarRed().then((estado) => {
          if (estado === "llega") {
            estuvoSinConexion = false;
            this.texto.set("Volvió la conexión y el servidor responde.");
            temporizador = window.setTimeout(() => this.texto.set(null), 3000);
          } else {
            this.texto.set("Hay red local, pero el servidor no responde. El contenido descargado sigue disponible.");
          }
        });
      } else {
        this.texto.set(null);
      }
    });
                                                                                        
    inject(DestroyRef).onDestroy(() => {
      dejarDeEscuchar();
      window.clearTimeout(temporizador);
    });
  }
}
