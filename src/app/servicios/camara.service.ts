                                                                                                  
                                                                                                   
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { describirErrorCamara, detenerCamaraDeFondo, iniciarCamaraDeFondo } from "../../camara";
import { VisorService } from "./visor.service";

@Injectable({ providedIn: "root" })
export class CamaraService {
  private readonly visorSvc = inject(VisorService);
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  readonly activa = signal(false);

  constructor() {
                                                                                 
    const alCambiarVisibilidad = () => {
      if (document.hidden && this.stream) {
        this.apagar();
        this.visorSvc.aviso.set("La cámara se apagó al salir de la página. Vuelve a activarla cuando quieras.");
      }
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    inject(DestroyRef).onDestroy(() => document.removeEventListener("visibilitychange", alCambiarVisibilidad));
  }

  registrarVideo(video: HTMLVideoElement): void {
    this.video = video;
  }

  apagar(): void {
    if (this.video) detenerCamaraDeFondo(this.video, this.stream);
    this.stream = null;
    this.visorSvc.visor()?.fondoTransparente(false);
    this.activa.set(false);
  }

  async alternar(): Promise<void> {
    if (this.stream) {
      this.apagar();
      return;
    }
    this.visorSvc.aviso.set("");
    try {
                                                                           
      this.stream = await iniciarCamaraDeFondo(this.video!);
    } catch (err) {
      this.visorSvc.aviso.set(describirErrorCamara(err));
      return;
    }
    this.visorSvc.visor()?.fondoTransparente(true);
    this.activa.set(true);
  }
}
