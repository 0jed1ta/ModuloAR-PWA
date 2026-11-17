                                                                                                     
import { Component, inject, signal } from "@angular/core";
import { InstalacionService } from "../servicios/instalacion.service";

@Component({
  selector: "section[zonaInstalar]",
  templateUrl: "./zona-instalar.html",
  host: { class: "instalar-zona", "aria-labelledby": "titulo-instalar" },
})
export class ZonaInstalar {
  protected readonly inst = inject(InstalacionService);
  protected readonly pidiendo = signal(false);

  protected async alPulsar(): Promise<void> {
    this.pidiendo.set(true);
    try {
      await this.inst.pedir();                                                                   
    } finally {
      this.pidiendo.set(false);
    }
  }
}
