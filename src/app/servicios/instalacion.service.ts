                                                                                                     
                                                                                               
                                                               
import { DestroyRef, Injectable, computed, inject, signal } from "@angular/core";
import { estadoInstalacion, iniciarInstalacion, instalacionPospuesta, instalacionRechazada, pedirInstalacion, posponerInstalacion } from "../../instalar";

export const TEXTO_INSTALACION = {
  instalada: "✓ Estás usando Atlas 3D como app instalada.",
  recienInstalada: "✓ Instalada. Ábrela desde su icono en la pantalla de inicio.",
  instalable: "Puedes instalarla: se abre a pantalla completa, desde su icono, y funciona sin conexión.",
  ios: "En iPhone y iPad no hay botón: en Safari toca Compartir y luego «Añadir a pantalla de inicio».",
  noDisponible: "Este navegador no ofrece instalar desde la página. Si ya la instalaste, ábrela desde su icono; si no, usa el menú del navegador → «Instalar app».",
  rechazada: "Cancelaste la instalación. Chrome decide cuándo volver a ofrecerla; mientras tanto, usa el menú ⋮ → «Instalar app».",
};

@Injectable({ providedIn: "root" })
export class InstalacionService {
  private readonly estado = signal(estadoInstalacion());
  private readonly rechazada = signal(instalacionRechazada());
  private readonly pospuesta = signal(instalacionPospuesta());

  readonly instalable = computed(() => this.estado() === "instalable");
  readonly texto = computed(() => {
    const e = this.estado();
    return e === "instalada" ? TEXTO_INSTALACION.instalada
      : e === "recien-instalada" ? TEXTO_INSTALACION.recienInstalada
      : e === "instalable" ? TEXTO_INSTALACION.instalable
      : e === "ios" ? TEXTO_INSTALACION.ios
      : this.pospuesta() ? "Elegiste «Ahora no». Volveremos a ofrecer la instalación dentro de siete días."
      : this.rechazada() ? TEXTO_INSTALACION.rechazada
      : TEXTO_INSTALACION.noDisponible;
  });

  constructor() {
    const dejarDeEscuchar = iniciarInstalacion(() => {
      this.estado.set(estadoInstalacion());
      this.rechazada.set(instalacionRechazada());
      this.pospuesta.set(instalacionPospuesta());
    });
    inject(DestroyRef).onDestroy(dejarDeEscuchar);
  }

  pedir = pedirInstalacion;
  posponer = posponerInstalacion;
}
