import {
  Component,
  ElementRef,
  DestroyRef,
  afterNextRender,
  inject,
  viewChild,
} from "@angular/core";
import { PanelModelo } from "./panel-modelo";
import { VisorService } from "../servicios/visor.service";
import { SensoresService } from "../servicios/sensores.service";
import { CamaraService } from "../servicios/camara.service";
import { ARService } from "../servicios/ar.service";

@Component({
  selector: "section[zonaVisor]",
  imports: [PanelModelo],
  templateUrl: "./zona-visor.html",
  host: { class: "visor-zona" },
})
export class ZonaVisor {
  protected readonly visorSvc = inject(VisorService);
  protected readonly sensores = inject(SensoresService);
  protected readonly camara = inject(CamaraService);
  protected readonly ar = inject(ARService);

  private temporizadorVisor = 0;
  private identificadorIdle = 0;

  private readonly contenedor =
    viewChild.required<ElementRef<HTMLDivElement>>("contenedor");
  private readonly video =
    viewChild.required<ElementRef<HTMLVideoElement>>("video");

  constructor() {
    afterNextRender(() => {
      this.camara.registrarVideo(this.video().nativeElement);

      const montar = () => {
        this.temporizadorVisor = 0;
        void this.visorSvc.montar(this.contenedor().nativeElement);
      };

      if (typeof window.requestIdleCallback === "function") {
        this.identificadorIdle = window.requestIdleCallback(montar, {
          timeout: 2500,
        });
      } else {
        this.temporizadorVisor = window.setTimeout(montar, 1200);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.identificadorIdle && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(this.identificadorIdle);
      }
      if (this.temporizadorVisor) {
        window.clearTimeout(this.temporizadorVisor);
      }
    });
  }

  protected alAlternarDiagnostico(e: Event): void {
    this.ar.diagAbierto.set((e.target as HTMLDetailsElement).open);
  }
}
