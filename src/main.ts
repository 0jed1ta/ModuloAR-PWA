import "./style.css";
import { abrirBaseDeDatos, alternarFavorito, guardarNotaDeEstudio, marcarModeloVisto, obtenerTodoElProgreso, type ProgresoModelo } from "./db";
import { cifrarTexto, descifrarTexto, derivarClaveDesdeContrasena, obtenerOCrearSal } from "./crypto";

const MODELOS_DEMO = [
  { id: "modelo-demo-1", nombre: "Patrón MVC" },
  { id: "modelo-demo-2", nombre: "Arquitectura en capas" },
  { id: "modelo-demo-3", nombre: "Microservicios" },
];

const appEl = document.querySelector<HTMLDivElement>("#app")!;
let db: IDBDatabase;
let claveSesion: CryptoKey | null = null;
let progresoPorId = new Map<string, ProgresoModelo>();

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
        <p class="eyebrow">Atlas 3D · Sesión 33</p>
        <h1>Progreso de modelos</h1>
        <p>Registra visitas, favoritos y notas privadas en tu dispositivo.</p>
      </header>
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

async function iniciar() {
  db = await abrirBaseDeDatos();
  actualizarProgreso(await obtenerTodoElProgreso(db));
  render();
}

iniciar();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((error: unknown) => console.error("Error al registrar SW:", error));
}
