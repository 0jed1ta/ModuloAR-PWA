import { Component, DestroyRef, afterNextRender, inject } from "@angular/core";
import { mostrarAviso } from "../avisos";
import { BASE_URL } from "../base";
import { ConexionService } from "./servicios/conexion.service";
import { InstalacionService } from "./servicios/instalacion.service";
import { SwService } from "./servicios/sw.service";
import { ZonaVisor } from "./componentes/zona-visor";
import { ZonaInstalar } from "./componentes/zona-instalar";
import { ZonaDescargas } from "./componentes/zona-descargas";
import { OverlayAR } from "./componentes/overlay-ar";
import { Catalogo } from "./componentes/catalogo";

@Component({
  selector: "app-root",
  imports: [ZonaVisor, ZonaInstalar, ZonaDescargas, OverlayAR, Catalogo],
  templateUrl: "./app.html",
})
export class App {
  protected readonly conexion = inject(ConexionService);

  constructor() {
    inject(InstalacionService);
    const sw = inject(SwService);
    afterNextRender(() => sw.iniciar());

    const alInstalar = () => void mostrarAviso("Atlas 3D instalado", "Ya puedes abrirlo desde tu pantalla de inicio.", BASE_URL, "atlas-instalado");
    window.addEventListener("appinstalled", alInstalar);
    inject(DestroyRef).onDestroy(() => window.removeEventListener("appinstalled", alInstalar));
  }
}
