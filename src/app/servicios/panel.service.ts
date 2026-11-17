                                                                                                   
                                                                                                             
import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { CATALOGO, modeloPorId } from "../../modelos";
import { leerFicha } from "../../descargas";
import type { Ficha } from "../../modelos/tipos";
import { VisorService } from "./visor.service";

@Injectable({ providedIn: "root" })
export class PanelService {
  private readonly visorSvc = inject(VisorService);

  readonly modeloId = signal(CATALOGO[0].id);
  readonly piezaId = signal<string | null>(null);
  private readonly fichaCargada = signal<{ id: string; datos: Ficha | null } | null>(null);

  readonly def = computed(() => modeloPorId(this.modeloId())!);
  readonly pieza = computed(() => this.def().piezas.find((p) => p.id === this.piezaId()));
  readonly ficha = computed(() => {
    const f = this.fichaCargada();
    return f?.id === this.modeloId() ? f.datos : null;
  });

  constructor() {
                                                                                                               
    effect(() => {
      const visor = this.visorSvc.visor();
      if (!visor) return;
      untracked(() => {
        this.elegirModelo(CATALOGO[0].id);
        visor.alTocarPieza((id) => this.piezaId.set(id));
      });
    });

                                                                                                                
    effect((alLimpiar) => {
      const id = this.modeloId();
      let vigente = true;                                                                            
      alLimpiar(() => (vigente = false));
      void leerFicha(id).then((datos) => {
        if (vigente) this.fichaCargada.set({ id, datos });
      });
    });
  }

                                                                                                 
  elegirModelo(id: string): void {
    const def = modeloPorId(id);
    const visor = this.visorSvc.visor();
    if (!def || !visor) return;
    visor.mostrarModelo(def);
    this.modeloId.set(id);
    this.piezaId.set(null);
  }

  elegirPieza(id: string | null): void {
    this.visorSvc.visor()?.seleccionar(id);
    this.piezaId.set(id);
  }

                                                             
  recorrerPiezas(paso: number): void {
    const ids: (string | null)[] = [null, ...this.def().piezas.map((p) => p.id)];
    const i = ids.indexOf(this.piezaId());
    this.elegirPieza(ids[(i + paso + ids.length) % ids.length]);
  }
}
