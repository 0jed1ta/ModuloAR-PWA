import "./style.css";
import { registerSW } from "virtual:pwa-register";
import {
  abrirBaseDeDatos,
  marcarModeloVisto,
  alternarFavorito,
  obtenerTodoElProgreso,
  guardarNotaDeEstudio,
  encolarDescargas,
  obtenerDescargas,
} from "./db";
import { derivarClaveDesdeContrasena, cifrarTexto, descifrarTexto, obtenerOCrearSal } from "./crypto";
import type { ProgresoModelo } from "./db";
import { crearVisor, type EstadoAR } from "./visor";
import { pedirPermisoOrientacion, hayOrientacionReal, iniciarControlOrientacion } from "./sensores";
import type { ControlOrientacion } from "./sensores";
import { estadoAvisos, pedirPermisoAvisos, mostrarAviso } from "./avisos";
import { ETIQUETA_SYNC, descargarPendientes, leerFicha } from "./descargas";
import { CATALOGO, modeloPorId } from "./modelos";
import { ROLES, type Ficha } from "./modelos/tipos";
import { describirRastro, leerRastro, PASO_FINAL } from "./rastro";
import { diagnosticarAR, mensajeSoporteAR, pedirSesionAR, describirErrorAR } from "./xr";
import { iniciarCamaraDeFondo, detenerCamaraDeFondo, describirErrorCamara } from "./camara";


const MODELOS = CATALOGO.map((m) => ({ id: m.id, nombre: m.nombre, resumen: m.resumen }));

const appEl = document.querySelector<HTMLDivElement>("#app")!;
let db: IDBDatabase;
let claveSesion: CryptoKey | null = null;
let progresoPorId = new Map<string, ProgresoModelo>();
let modelosDescargados = new Set<string>(); // Sesión 37: fichas ya guardadas para uso sin conexión

async function obtenerClaveSesion(): Promise<CryptoKey | null> {
  if (claveSesion) return claveSesion;
  const contrasena = window.prompt(
    "Contraseña para cifrar/descifrar la nota de estudio (la misma cada vez — no se guarda en ningún lado):"
  );
  if (!contrasena) return null;
  const sal = obtenerOCrearSal();
  claveSesion = await derivarClaveDesdeContrasena(contrasena, sal);
  return claveSesion;
}

function render() {
  appEl.innerHTML = `
    <div class="atlas-demo">
      <h1>Atlas 3D de Arquitectura de Software</h1>
      <p class="aviso-demo">
        Marca cada modelo como visto, guárdalo como favorito o escribe una nota de estudio (se cifra en tu dispositivo).
      </p>
      <div class="modelos-grid">
        ${MODELOS.map((m) => {
          const p = progresoPorId.get(m.id);
          const favorito = p?.favorito ?? false;
          const ultimaVisita = p?.ultimaVisita ? new Date(p.ultimaVisita).toLocaleString() : "nunca";
          const tieneNota = !!p?.notaCifrada;
          return `
            <article class="modelo-card" data-id="${m.id}">
              <h2>${m.nombre}</h2>
              <p class="resumen-card">${m.resumen}</p>
              <p class="meta">Última visita: ${ultimaVisita}${modelosDescargados.has(m.id) ? ' · <span class="disponible">✓ disponible sin conexión</span>' : ""}</p>
              <div class="acciones">
                <button class="btn-ver3d" data-id="${m.id}">🧊 Ver en 3D</button>
                <button class="btn-visitar" data-id="${m.id}">Marcar como visto</button>
                <button class="btn-favorito" data-id="${m.id}">${favorito ? "★ Favorito" : "☆ Marcar favorito"}</button>
              </div>
              <div class="nota-zona">
                <input type="text" class="nota-input" placeholder="Nota de estudio..." />
                <button class="btn-guardar-nota" data-id="${m.id}">🔒 Guardar nota</button>
                <button class="btn-ver-nota" data-id="${m.id}" ${tieneNota ? "" : "disabled"}>👁 Ver nota</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </div>
  `;

  appEl.querySelectorAll<HTMLButtonElement>(".btn-ver3d").forEach((btn) =>
    btn.addEventListener("click", () => {
      elegirModelo(btn.dataset.id!);
      document.querySelector("#visor")?.scrollIntoView({ block: "center", behavior: "smooth" });
    })
  );

  appEl.querySelectorAll<HTMLButtonElement>(".btn-visitar").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const registro = await marcarModeloVisto(db, id);
      progresoPorId.set(id, registro);
      render();
    })
  );

  appEl.querySelectorAll<HTMLButtonElement>(".btn-favorito").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      await alternarFavorito(db, id);
      const todo = await obtenerTodoElProgreso(db);
      progresoPorId = new Map(todo.map((p) => [p.modeloId, p]));
      render();
    })
  );

  appEl.querySelectorAll<HTMLButtonElement>(".btn-guardar-nota").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const card = btn.closest(".modelo-card")!;
      const input = card.querySelector<HTMLInputElement>(".nota-input")!;
      if (!input.value.trim()) return;
      const clave = await obtenerClaveSesion();
      if (!clave) return;
      await guardarNotaDeEstudio(db, clave, id, input.value, cifrarTexto);
      const todo = await obtenerTodoElProgreso(db);
      progresoPorId = new Map(todo.map((p) => [p.modeloId, p]));
      render();
    })
  );

  appEl.querySelectorAll<HTMLButtonElement>(".btn-ver-nota").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const p = progresoPorId.get(id);
      if (!p?.notaCifrada || !p.notaIv) return;
      const clave = await obtenerClaveSesion();
      if (!clave) return;
      try {
        const texto = await descifrarTexto(clave, { cifrado: p.notaCifrada, iv: p.notaIv });
        window.alert(`Nota de estudio de "${id}":\n\n${texto}`);
      } catch {
        window.alert("No se pudo descifrar — la contraseña ingresada no es la correcta.");
      }
    })
  );
}

async function refrescarDescargados() {
  const descargas = await obtenerDescargas(db);
  modelosDescargados = new Set(descargas.filter((d) => d.estado === "listo").map((d) => d.modeloId));
}

async function iniciar() {
  db = await abrirBaseDeDatos();
  const todo = await obtenerTodoElProgreso(db);
  progresoPorId = new Map(todo.map((p) => [p.modeloId, p]));
  await refrescarDescargados();
  render();
  const destacado = new URLSearchParams(location.search).get("modelo");
  if (destacado) {
    const tarjeta = appEl.querySelector<HTMLElement>(`[data-id="${CSS.escape(destacado)}"]`);
    tarjeta?.classList.add("destacada");
    tarjeta?.scrollIntoView({ block: "center" });
  }
}

const dbLista = iniciar();

const visor = crearVisor(document.querySelector<HTMLElement>("#visor")!);

const tabsModelo = document.querySelector<HTMLElement>("#tabs-modelo")!;
const resumenModelo = document.querySelector<HTMLElement>("#modelo-resumen")!;
const leyendaEl = document.querySelector<HTMLElement>("#leyenda")!;
const chipsPiezas = document.querySelector<HTMLElement>("#chips-piezas")!;
const detallePieza = document.querySelector<HTMLElement>("#pieza-detalle")!;
let modeloActualId: string | null = null;
let piezaActual: string | null = null;
let fichaActual: Ficha | null = null;

function elegirModelo(id: string): void {
  const def = modeloPorId(id);
  if (!def) return;
  modeloActualId = id;
  piezaActual = null;
  fichaActual = null;
  visor.mostrarModelo(def);
  tabsModelo.innerHTML = CATALOGO.map((m) => `<button type="button" class="tab" data-id="${m.id}" aria-pressed="${m.id === id}">${m.nombre}</button>`).join("");
  tabsModelo.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => b.addEventListener("click", () => elegirModelo(b.dataset.id!)));
  resumenModelo.textContent = def.resumen;
  const roles = [...new Set(def.piezas.map((p) => p.rol))];
  leyendaEl.innerHTML = roles.map((r) => `<span class="leyenda-item"><i style="background:${ROLES[r].css}"></i>${ROLES[r].nombre}</span>`).join("");
  chipsPiezas.innerHTML = def.piezas.map((p) => `<button type="button" class="chip" data-id="${p.id}" aria-pressed="false"><i style="background:${ROLES[p.rol].css}"></i>${p.nombre}</button>`).join("");
  chipsPiezas.querySelectorAll<HTMLButtonElement>(".chip").forEach((b) =>
    b.addEventListener("click", () => {
      const nueva = piezaActual === b.dataset.id ? null : b.dataset.id!;
      visor.seleccionar(nueva);
      sincronizarPieza(nueva);
    })
  );
  pintarDetalle();
  pintarPiezaAR();
  void leerFicha(id).then((f) => {
    if (modeloActualId !== id) return;
    fichaActual = f;
    pintarDetalle();
    pintarPiezaAR();
  });
}

/** Refleja en la interfaz la pieza que ya resaltó el visor. */
function sincronizarPieza(id: string | null): void {
  piezaActual = id;
  chipsPiezas.querySelectorAll<HTMLButtonElement>(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
  pintarDetalle();
  pintarPiezaAR();
}

function nombresDe(def: NonNullable<ReturnType<typeof modeloPorId>>, ids: string[]): string {
  return ids.map((x) => def.piezas.find((p) => p.id === x)?.nombre ?? x).join(", ");
}

function pintarDetalle(): void {
  const def = modeloPorId(modeloActualId ?? "");
  if (!def) return;
  const pieza = def.piezas.find((p) => p.id === piezaActual);
  const extra = pieza ? fichaActual?.piezas[pieza.id] : null;
  const sinFicha = fichaActual ? "" : '<p class="nota-ficha">Detalle ampliado no disponible: descarga las fichas (abajo) para leerlo sin conexión.</p>';
  if (pieza) {
    detallePieza.innerHTML =
      `<h3><i style="background:${ROLES[pieza.rol].css}"></i>${pieza.nombre} <small>${ROLES[pieza.rol].nombre}</small></h3>` +
      `<p>${pieza.resumen}</p>` +
      (extra ? `<p><b>Responsabilidad.</b> ${extra.responsabilidad}</p><p><b>Habla con:</b> ${nombresDe(def, extra.habla_con)}.</p>` : sinFicha);
  } else {
    detallePieza.innerHTML =
      "<p>Toca una pieza del modelo, o elígela en la lista, para ver qué hace. Toca la misma pieza otra vez para soltarla.</p>" +
      (fichaActual ? `<p><b>Cuándo usarlo.</b> ${fichaActual.cuando_usarlo}</p><p><b>Riesgo.</b> ${fichaActual.riesgo}</p>` : sinFicha);
  }
}

visor.alTocarPieza((id) => sincronizarPieza(id));
const btnOrientacion = document.querySelector<HTMLButtonElement>("#btn-orientacion")!;
const btnCalibrar = document.querySelector<HTMLButtonElement>("#btn-calibrar")!;
const lecturaVisor = document.querySelector<HTMLElement>("#lectura-visor")!;
const avisoVisor = document.querySelector<HTMLElement>("#aviso-visor")!;
let control: ControlOrientacion | null = null;
let timerLectura = 0;

function avisarVisor(texto: string) {
  avisoVisor.textContent = texto;
  avisoVisor.hidden = !texto;
}

function apagarSensores() {
  control?.detener();
  control = null;
  window.clearInterval(timerLectura);
  visor.controlPorSensores(false);
  lecturaVisor.textContent = "";
  btnCalibrar.disabled = true;
  btnOrientacion.textContent = "📱 Rotar con el teléfono";
}

btnOrientacion.addEventListener("click", async () => {
  if (control) {
    apagarSensores(); // segundo clic: volver al control manual
    return;
  }
  const permiso = await pedirPermisoOrientacion();
  if (permiso === "denied") {
    avisarVisor("Denegaste el acceso a los sensores. Sigue disponible el control con ratón o dedo.");
    return;
  }
  if (permiso === "no-soportado" || !(await hayOrientacionReal())) {
    avisarVisor("Este dispositivo no tiene sensores de orientación. Usa el ratón o el dedo para girar el visor.");
    return;
  }
  avisarVisor("");
  visor.controlPorSensores(true);
  control = iniciarControlOrientacion((x, y) => visor.rotarHacia(x, y));
  btnCalibrar.disabled = false;
  btnOrientacion.textContent = "📱 Sensores: ACTIVOS (toca para apagar)";
  timerLectura = window.setInterval(() => {
    const { x, y } = visor.rotacionActualGrados();
    lecturaVisor.textContent = `rotación X ${x}° · Y ${y}°`;
  }, 150);
});
btnCalibrar.addEventListener("click", () => control?.calibrar());

const videoFondo = document.querySelector<HTMLVideoElement>("#fondo-camara")!;
const btnCamara = document.querySelector<HTMLButtonElement>("#btn-camara")!;
let streamFondo: MediaStream | null = null;

function apagarCamara() {
  detenerCamaraDeFondo(videoFondo, streamFondo);
  streamFondo = null;
  videoFondo.hidden = true;
  visor.fondoTransparente(false);
  btnCamara.textContent = "📷 Cámara de fondo";
}

btnCamara.addEventListener("click", async () => {
  if (streamFondo) {
    apagarCamara();
    return;
  }
  avisarVisor("");
  try {
    streamFondo = await iniciarCamaraDeFondo(videoFondo);
  } catch (err) {
    avisarVisor(describirErrorCamara(err));
    return;
  }
  videoFondo.hidden = false;
  visor.fondoTransparente(true);
  btnCamara.textContent = "📷 Cámara: ACTIVA (toca para apagar)";
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && streamFondo) {
    apagarCamara();
    avisarVisor("La cámara se apagó al salir de la página. Vuelve a activarla cuando quieras.");
  }
});

const MODELOS_IDS = MODELOS.map((m) => m.id);
const btnAvisos = document.querySelector<HTMLButtonElement>("#btn-avisos")!;
const btnDescargar = document.querySelector<HTMLButtonElement>("#btn-descargar")!;
const estadoAvisosEl = document.querySelector<HTMLElement>("#estado-avisos")!;
const estadoDescargaEl = document.querySelector<HTMLElement>("#estado-descarga")!;
const progresoEl = document.querySelector<HTMLProgressElement>("#progreso-descarga")!;

function pintarEstadoAvisos() {
  const permiso = estadoAvisos();
  btnAvisos.disabled = permiso !== "default";
  estadoAvisosEl.textContent =
    permiso === "granted" ? "Avisos activos."
    : permiso === "denied" ? "Avisos bloqueados (cámbialo en la configuración del sitio)."
    : permiso === "no-soportado" ? "Este navegador no soporta notificaciones."
    : "Avisos sin activar.";
}
pintarEstadoAvisos();

btnAvisos.addEventListener("click", async () => {
  const permiso = await pedirPermisoAvisos();
  if (permiso === "granted") await mostrarAviso("Avisos activados", "Te avisaremos cuando las fichas estén listas.");
  pintarEstadoAvisos();
});

function pintarProgreso(hechos: number, total: number) {
  progresoEl.hidden = false;
  progresoEl.max = total;
  progresoEl.value = hechos;
  estadoDescargaEl.textContent = hechos >= total ? `✓ ${hechos} de ${total} fichas guardadas: ya puedes consultarlas sin conexión.` : `Descargando… ${hechos} de ${total} fichas.`;
}

navigator.serviceWorker?.addEventListener("message", async (e) => {
  if (e.data?.tipo === "progreso") pintarProgreso(e.data.hechos, e.data.total);
  if (e.data?.tipo === "descarga-completa") {
    await dbLista;
    await refrescarDescargados();
    render();
  }
});

btnDescargar.addEventListener("click", async () => {
  await dbLista;
  await encolarDescargas(db, MODELOS_IDS);
  pintarProgreso(0, MODELOS_IDS.length);
  btnDescargar.disabled = true;
  try {
    let enSegundoPlano = false;
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(ETIQUETA_SYNC);
        enSegundoPlano = true;
        estadoDescargaEl.textContent = "Descarga solicitada: el navegador la completará en cuanto haya conexión.";
      } catch {
        enSegundoPlano = false;
      }
    }
    if (!enSegundoPlano) {
      await descargarPendientes(db, pintarProgreso);
      await refrescarDescargados();
      render();
    }
  } catch (err) {
    estadoDescargaEl.textContent = "No se pudo completar la descarga: " + (err instanceof Error ? err.message : String(err));
  } finally {
    btnDescargar.disabled = false;
  }
});

window.addEventListener("appinstalled", () => {
  void mostrarAviso("Atlas 3D instalado", "Ya puedes abrirlo desde tu pantalla de inicio.", import.meta.env.BASE_URL, "atlas-instalado");
});

const btnAR = document.querySelector<HTMLButtonElement>("#btn-ar")!;
const estadoAR = document.querySelector<HTMLElement>("#estado-ar")!;
const overlayAR = document.querySelector<HTMLElement>("#xr-overlay")!;
const btnSalirAR = document.querySelector<HTMLButtonElement>("#btn-salir-ar")!;
const xrEstado = document.querySelector<HTMLElement>("#xr-estado")!;
const xrDatos = document.querySelector<HTMLElement>("#xr-datos")!;
const xrPieza = document.querySelector<HTMLElement>("#xr-pieza")!;
const btnPiezaAnt = document.querySelector<HTMLButtonElement>("#btn-pieza-ant")!;
const btnPiezaSig = document.querySelector<HTMLButtonElement>("#btn-pieza-sig")!;

function recorrerPiezas(paso: number): void {
  const def = modeloPorId(modeloActualId ?? "");
  if (!def) return;
  const ids: (string | null)[] = [null, ...def.piezas.map((p) => p.id)];
  const i = ids.indexOf(piezaActual);
  const siguiente = ids[(i + paso + ids.length) % ids.length];
  visor.seleccionar(siguiente);
  sincronizarPieza(siguiente);
}
btnPiezaAnt.addEventListener("click", () => recorrerPiezas(-1));
btnPiezaSig.addEventListener("click", () => recorrerPiezas(1));

function pintarPiezaAR(): void {
  const def = modeloPorId(modeloActualId ?? "");
  const pieza = def?.piezas.find((p) => p.id === piezaActual);
  const extra = pieza ? fichaActual?.piezas[pieza.id] : null;
  const texto = pieza ? `${pieza.nombre}: ${extra ? extra.responsabilidad : pieza.resumen}` : `${def?.nombre ?? "Modelo"}. Usa ◀ ▶ para recorrer sus piezas.`;
  if (xrPieza.textContent !== texto) xrPieza.textContent = texto;
}
let sesionAR: XRSession | null = null;

const diagAR = document.querySelector<HTMLElement>("#diag-ar")!;
const detallesAR = document.querySelector<HTMLDetailsElement>(".diag-ar")!;
const btnRecomprobar = document.querySelector<HTMLButtonElement>("#btn-recomprobar")!;

async function comprobarAR(): Promise<void> {
  const { estado, lineas } = await diagnosticarAR();
  estadoAR.textContent = mensajeSoporteAR(estado);
  diagAR.textContent = [...lineas, sesionAR ? "Sesión de AR en curso." : describirRastro()].join("\n");
  if (!sesionAR) btnAR.disabled = estado !== "disponible";
  const rastro = leerRastro();
  detallesAR.open = estado !== "disponible" || (!sesionAR && rastro !== null && rastro.paso !== PASO_FINAL);
}
void comprobarAR();
btnRecomprobar.addEventListener("click", () => void comprobarAR());
navigator.xr?.addEventListener("devicechange", () => void comprobarAR());

function ayudaAR(e: EstadoAR): string {
  if (!e.hitTest) return "Este dispositivo no ofrece hit-test: el modelo está a 1,5 m delante. Toca para traerlo delante de ti.";
  switch (e.fase) {
    case "buscando":
      return e.sinSuperficie
        ? "No encuentro superficies. Prueba con una zona con textura y buena luz, o toca la pantalla para colocar el modelo delante de ti."
        : "Mueve el teléfono despacio hasta ver el anillo verde sobre una superficie.";
    case "listo":
      return "Toca la pantalla para colocar el modelo.";
    case "colocado":
      return e.overlay
        ? "Arrastra para moverlo, gira con dos dedos, pellizca para el tamaño. Toca otro punto para recolocarlo."
        : "Modelo colocado. Toca otro punto para recolocarlo.";
  }
}

const INTERVALO_OVERLAY_MS = 200;
let ultimoPintado = 0;
let pendienteAR: EstadoAR | null = null;
let temporizadorAR = 0;

function pintarEstadoAR(e: EstadoAR): void {
  const si = (v: boolean) => (v ? "sí" : "no");
  const { x, y, z } = e.posicion;
  const pos = e.fase === "colocado" ? `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) m` : "—";
  const ayuda = ayudaAR(e);
  const datos =
    `hit-test: ${si(e.hitTest)} · anclas: ${si(e.anclas)} · anclado: ${si(e.anclado)} · ` +
    `fase: ${e.fase} · escala: ${e.escala.toFixed(2)} · giro: ${e.giroGrados}° · pos: ${pos} · ` +
    `consultas: ${e.consultas} · resultados: ${e.resultados} · poses: ${e.impactos}`;
  if (xrEstado.textContent !== ayuda) xrEstado.textContent = ayuda;
  if (xrDatos.textContent !== datos) xrDatos.textContent = datos;
}

function mostrarEstadoAR(e: EstadoAR): void {
  if (performance.now() - ultimoPintado >= INTERVALO_OVERLAY_MS) {
    ultimoPintado = performance.now();
    pintarEstadoAR(e);
    return;
  }
  pendienteAR = e; // se pintará el último estado cuando venza el intervalo
  if (temporizadorAR) return;
  temporizadorAR = window.setTimeout(() => {
    temporizadorAR = 0;
    ultimoPintado = performance.now();
    if (pendienteAR) pintarEstadoAR(pendienteAR);
    pendienteAR = null;
  }, INTERVALO_OVERLAY_MS);
}

btnAR.addEventListener("click", async () => {
  avisarVisor("");
  apagarCamara();
  apagarSensores();
  try {
    const sesion = await pedirSesionAR(overlayAR);
    sesionAR = sesion;
    btnAR.disabled = true;
    const estado = await visor.entrarEnAR(sesion, {
      overlay: overlayAR,
      alCambiar: mostrarEstadoAR,
      alTerminar: () => {
        sesionAR = null;
        btnAR.disabled = false;
        estadoAR.textContent = "La sesión de realidad aumentada terminó.";
      },
    });
    const faltan = [!estado.overlay && "dom-overlay", !estado.hitTest && "hit-test", !estado.anclas && "anchors"].filter(Boolean);
    estadoAR.textContent = faltan.length
      ? `Sesión de realidad aumentada activa. El navegador no concedió: ${faltan.join(", ")}.`
      : "Sesión de realidad aumentada activa con hit-test, anclas y botones sobre la cámara.";
  } catch (err) {
    sesionAR?.end().catch(() => {});
    sesionAR = null;
    btnAR.disabled = false;
    avisarVisor(describirErrorAR(err));
  }
});

btnSalirAR.addEventListener("beforexrselect", (e) => e.preventDefault());
[btnPiezaAnt, btnPiezaSig].forEach((b) => b.addEventListener("beforexrselect", (e) => e.preventDefault()));

btnSalirAR.addEventListener("click", () => {
  void sesionAR?.end();
});

registerSW({
  immediate: true,
  onOfflineReady() {
    estadoDescargaEl.textContent = "✓ La app ya funciona sin conexión.";
    if (document.visibilityState !== "visible") {
      void mostrarAviso("Atlas 3D listo", "Ya funciona sin conexión.", import.meta.env.BASE_URL, "atlas-offline");
    }
  },
  onRegisteredSW(swUrl, registration) {
    console.log("SW de Workbox registrado:", swUrl, registration);
  },
  onRegisterError(error) {
    console.error("Error al registrar el SW de Workbox:", error);
  },
});

elegirModelo(CATALOGO[0].id);
