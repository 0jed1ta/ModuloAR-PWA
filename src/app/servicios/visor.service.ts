                                                                                                           
                                                                                                      
                                                                                           
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import type { Visor } from "../../visor";

@Injectable({ providedIn: "root" })
export class VisorService {
  readonly visor = signal<Visor | null>(null);
                                                                          
  readonly aviso = signal("");

  private destruido = false;

  constructor() {
                                                                                              
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.visor()?.destruir();
    });
  }

  async montar(contenedor: HTMLElement): Promise<void> {
                                                                                                            
                                                                                                                     
    const { crearVisor } = await import("../../visor");
    if (this.destruido) return;                                                               
    this.visor.set(crearVisor(contenedor));
  }
}
