import "./style.css";
import { abrirBaseDeDatos, alternarFavorito, guardarNotaDeEstudio, marcarModeloVisto, obtenerTodoElProgreso, type ProgresoModelo } from "./db";
import { cifrarTexto, descifrarTexto, derivarClaveDesdeContrasena, obtenerOCrearSal } from "./crypto";
import { registerSW } from "virtual:pwa-register";
import { crearVisor, type Visor } from "./visor";
import { hayOrientacionReal, iniciarControlOrientacion, pedirPermisoOrientacion, type ControlOrientacion } from "./sensores";
import { describirErrorCamara, detenerCamaraDeFondo, iniciarCamaraDeFondo } from "./camara";

const MODELOS_DEMO = [
  { id: "modelo-demo-1", nombre: "Patrón MVC" },
  { id: "modelo-demo-2", nombre: "Arquitectura en capas" },
  { id: "modelo-demo-3", nombre: "Microservicios" },
];

const appEl = document.querySelector<HTMLDivElement>("#app")!;
let db: IDBDatabase;
let claveSesion: CryptoKey | null = null;
let progresoPorId = new Map<string, ProgresoModelo>();
let visor: Visor | null = null;
let controlOrientacion: ControlOrientacion | null = null;
let lecturaTimer = 0;
let camaraStream: MediaStream | null = null;

async function obtenerClaveSesion(): Promise<CryptoKey | null> {
  if (claveSesion) return claveSesion;
  const contrasena = window.prompt("Contraseña para cifrar o descifrar la nota de estudio:");
  if (!contrasena) return null;
  claveSesion = await derivarClaveDesdeContrasena(contrasena, obtenerOCrearSal());
  return claveSesion;
}

function actualizarProgreso(progreso: ProgresoModelo[]) {
  progresoPorId = new Map(progreso.map((registro) => [registro.modeloId, registro]));
}

function render() {
  appEl.innerHTML = `
    <main class="atlas-demo">
      <header class="atlas-header">
        <p class="eyebrow">Atlas 3D · Sesión 35</p>
        <h1>Visor 3D y progreso</h1>
        <p>Explora el modelo con el ratón o mueve el teléfono para cambiar su orientación.</p>
      </header>
      <section class="visor-panel" aria-label="Visor 3D">
        <video id="camara-fondo" class="camara-fondo" autoplay muted playsinline hidden></video>
        <div id="visor" class="visor-canvas"></div>
        <div class="visor-controls">
          <button id="btn-orientacion">📱 Rotar con el teléfono</button>
          <button id="btn-calibrar" class="btn-favorito" disabled>Calibrar</button>
          <button id="btn-camara" class="btn-favorito">📷 Activar cámara</button>
          <span id="lectura-visor" class="lectura-visor"></span>
        </div>
        <p id="aviso-visor" class="aviso-visor" hidden></p>
      </section>
      <section class="modelos-grid" aria-label="Modelos de demostración">
        ${MODELOS_DEMO.map((modelo) => {
          const progreso = progresoPorId.get(modelo.id);
          const visita = progreso?.ultimaVisita ? new Date(progreso.ultimaVisita).toLocaleString() : "Sin visitas";
          const tieneNota = Boolean(progreso?.notaCifrada);
          return `
            <article class="modelo-card">
              <div class="modelo-card__top"><span>${modelo.id.replace("modelo-demo-", "0")}</span><span>${progreso?.favorito ? "Favorito" : "Disponible"}</span></div>
              <h2>${modelo.nombre}</h2>
              <p class="meta">Última visita: ${visita}</p>
              <div class="acciones">
                <button class="btn-visitar" data-id="${modelo.id}">Marcar visto</button>
                <button class="btn-favorito" data-id="${modelo.id}">${progreso?.favorito ? "★ Favorito" : "☆ Favorito"}</button>
              </div>
              <div class="nota-zona">
                <input type="text" class="nota-input" placeholder="Nota de estudio privada" aria-label="Nota para ${modelo.nombre}" />
                <button class="btn-guardar-nota" data-id="${modelo.id}">Guardar nota cifrada</button>
                <button class="btn-ver-nota" data-id="${modelo.id}" ${tieneNota ? "" : "disabled"}>Ver nota</button>
              </div>
            </article>
          `;
        }).join("")}
      </section>
    </main>
  `;

  configurarVisor();

  appEl.querySelectorAll<HTMLButtonElement>(".btn-visitar").forEach((button) => {
    button.addEventListener("click", async () => {
      await marcarModeloVisto(db, button.dataset.id!);
      actualizarProgreso(await obtenerTodoElProgreso(db));
      render();
    });
  });
  appEl.querySelectorAll<HTMLButtonElement>(".btn-favorito").forEach((button) => {
    button.addEventListener("click", async () => {
      await alternarFavorito(db, button.dataset.id!);
      actualizarProgreso(await obtenerTodoElProgreso(db));
      render();
    });
  });
  appEl.querySelectorAll<HTMLButtonElement>(".btn-guardar-nota").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest<HTMLElement>(".modelo-card")!;
      const input = card.querySelector<HTMLInputElement>(".nota-input")!;
      if (!input.value.trim()) return;
      const clave = await obtenerClaveSesion();
      if (!clave) return;
      await guardarNotaDeEstudio(db, clave, button.dataset.id!, input.value.trim(), cifrarTexto);
      actualizarProgreso(await obtenerTodoElProgreso(db));
      render();
    });
  });
  appEl.querySelectorAll<HTMLButtonElement>(".btn-ver-nota").forEach((button) => {
    button.addEventListener("click", async () => {
      const progreso = progresoPorId.get(button.dataset.id!);
      if (!progreso?.notaCifrada || !progreso.notaIv) return;
      const clave = await obtenerClaveSesion();
      if (!clave) return;
      try {
        const nota = await descifrarTexto(clave, { cifrado: progreso.notaCifrada, iv: progreso.notaIv });
        window.alert(`Nota de estudio de ${button.dataset.id}:\n\n${nota}`);
      } catch {
        window.alert("No se pudo descifrar la nota con esa contraseña.");
      }
    });
  });
}

function configurarVisor() {
  controlOrientacion?.detener();
  window.clearInterval(lecturaTimer);
  visor?.destruir();
  const contenedor = document.querySelector<HTMLElement>("#visor");
  const boton = document.querySelector<HTMLButtonElement>("#btn-orientacion");
  const calibrar = document.querySelector<HTMLButtonElement>("#btn-calibrar");
  const lectura = document.querySelector<HTMLElement>("#lectura-visor");
  const aviso = document.querySelector<HTMLElement>("#aviso-visor");
  const video = document.querySelector<HTMLVideoElement>("#camara-fondo");
  const botonCamara = document.querySelector<HTMLButtonElement>("#btn-camara");
  if (!contenedor || !boton || !calibrar || !lectura || !aviso || !video || !botonCamara) return;
  visor = crearVisor(contenedor);
  controlOrientacion = null;
  boton.addEventListener("click", async () => {
    if (controlOrientacion) {
      controlOrientacion.detener();
      controlOrientacion = null;
      visor?.controlPorSensores(false);
      window.clearInterval(lecturaTimer);
      calibrar.disabled = true;
      lectura.textContent = "";
      boton.textContent = "📱 Rotar con el teléfono";
      return;
    }
    const permiso = await pedirPermisoOrientacion();
    if (permiso === "denied" || permiso === "no-soportado" || !(await hayOrientacionReal())) {
      aviso.textContent = permiso === "denied" ? "Denegaste el acceso a los sensores. Usa el control manual." : "Este dispositivo no tiene sensores de orientación. Usa el ratón o el dedo.";
      aviso.hidden = false;
      return;
    }
    aviso.hidden = true;
    visor?.controlPorSensores(true);
    controlOrientacion = iniciarControlOrientacion((x, y) => visor?.rotarHacia(x, y));
    calibrar.disabled = false;
    boton.textContent = "📱 Sensores activos (toca para apagar)";
    lecturaTimer = window.setInterval(() => {
      const actual = visor?.rotacionActualGrados();
      if (actual) lectura.textContent = `Rotación X ${actual.x}° · Y ${actual.y}°`;
    }, 150);
  });
  calibrar.addEventListener("click", () => controlOrientacion?.calibrar());
  const apagarCamara = () => {
    if (!camaraStream) return;
    detenerCamaraDeFondo(video, camaraStream);
    camaraStream = null;
    video.hidden = true;
    visor?.fondoTransparente(false);
    botonCamara.textContent = "📷 Activar cámara";
    aviso.textContent = "La cámara se apagó al salir de la página. Actívala de nuevo con un clic.";
    aviso.hidden = false;
  };
  botonCamara.addEventListener("click", async () => {
    if (camaraStream) {
      apagarCamara();
      return;
    }
    try {
      camaraStream = await iniciarCamaraDeFondo(video);
      video.hidden = false;
      visor?.fondoTransparente(true);
      aviso.hidden = true;
      botonCamara.textContent = "📷 Cámara activa (toca para apagar)";
    } catch (error) {
      aviso.textContent = describirErrorCamara(error);
      aviso.hidden = false;
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) apagarCamara();
  });
}

async function iniciar() {
  db = await abrirBaseDeDatos();
  actualizarProgreso(await obtenerTodoElProgreso(db));
  render();
}

iniciar();

if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.log("SW de Workbox registrado:", swUrl, registration);
    },
    onRegisterError(error) {
      console.error("Error al registrar el SW de Workbox:", error);
    },
  });
}
